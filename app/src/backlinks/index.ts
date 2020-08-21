import * as path from "path";
import {i18n} from "../i18n";
import {escapeHtml} from "../util/escape";
import {Model} from "../layout/Model";
import {Tab} from "../layout/Tab";
import {processMessage} from "../util/processMessage";
import {getIconByType, openFile} from "../editor/util";
import {hasClosestByAttribute, hasClosestByClassName} from "../../vditore/src/ts/util/hasClosest";
import {getAllModels} from "../layout/util";

export class Backlinks extends Model {
    private element: HTMLElement
    public url: string
    public path: string

    constructor(options: {
        tab: Tab
        url?: string
        path?: string
    }) {
        super({
            id: options.tab.id,
            callback() {
                if (options.path) {
                    this.send("treebacklinks", {
                        url: options.url,
                        path: options.path
                    });
                } else {
                    this.send("backlinks", {});
                    this.element.innerHTML = `<div class="backlinks__title"><div class="ft__secondary ft__smaller">${i18n[window.liandi.config.lang].noBacklinks}</div></div>`;
                }
            }
        });
        this.url = options.url;
        this.path = options.path;
        this.ws.onmessage = (event) => {
            const data = processMessage(event.data);
            if (data) {
                switch (data.cmd) {
                    case "backlinks":
                    case "treebacklinks":
                        this.onBacklinks(data.data);
                        break;
                    case "reload":
                        if (this.path) {
                            if (data.data.url === this.url && data.data.path === this.path) {
                                this.send("treebacklinks", {
                                    url: options.url,
                                    path: options.path
                                });
                            }
                        } else {
                            this.send("backlinks", {});
                        }
                        break;
                }
            }
        };

        this.element = options.tab.panelElement;
        this.element.classList.add("backlinks");
        this.element.addEventListener("click", (event) => {
            let target = event.target as HTMLElement;
            while (target && !target.isEqualNode(this.element)) {
                if (target.getAttribute("data-open") === "true") {
                    openFile(decodeURIComponent(target.getAttribute("data-url")), decodeURIComponent(target.getAttribute("data-path")));
                    event.preventDefault();
                    event.stopPropagation();
                    break;
                }
                target = target.parentElement;
            }
        });
        this.element.addEventListener("mouseover", (event: MouseEvent & { target: HTMLElement }) => {
            const itemElement = hasClosestByClassName(event.target, "item__content");
            if (itemElement) {
                const nodeId = itemElement.getAttribute("data-id")
                const type = itemElement.getAttribute("data-type")
                const url = decodeURIComponent(itemElement.getAttribute("data-url"))
                const filePath = decodeURIComponent(itemElement.getAttribute("data-path"))
                getAllModels().editor.find((item) => {
                    if (item.url === url && item.path === filePath) {
                        const vditorElement = item.vditore.vditor.ir.element
                        if (type === "NodeDocument") {
                            vditorElement.classList.add("editor__mdref")
                            itemElement.onmouseleave = () => {
                                vditorElement.classList.remove("editor__mdref")
                            };
                            return true
                        }
                        Array.from(vditorElement.children).find((item: HTMLElement) => {
                            if (item.getAttribute("data-node-id") === nodeId) {
                                item.classList.add("editor__blockref")
                                vditorElement.scrollTop = item.getClientRects()[0].top + vditorElement.scrollTop - vditorElement.clientHeight / 2 + 10;
                                itemElement.onmouseleave = () => {
                                    item.classList.remove("editor__blockref")
                                };
                                return true
                            }
                        })
                        return true
                    }
                })
            }
        });
    }

    public onBacklinks(data: { backlinks: IBacklinks[] | IAllBacklinks[], url: string, path: string }) {
        let backlinksHTML = "";
        if (data.url) {
            backlinksHTML = '';
            (data.backlinks as IBacklinks[]).forEach((files) => {
                backlinksHTML += `<div class="item"><div data-open="true" class="item__name" data-path="${encodeURIComponent(files.path)}" data-url="${encodeURIComponent(files.url)}" class="fn__flex">
${escapeHtml(path.posix.join(path.posix.basename(files.url), files.path))}
</div>`;
                files.blocks.forEach((item) => {
                    backlinksHTML += `<div class="item__content fn__a fn__two-line" data-url="${encodeURIComponent(item.def.url)}" data-path="${encodeURIComponent(item.def.path)}" data-id="${item.def.id}" data-type="${item.def.type}">
<svg><use xlink:href="#${getIconByType(item.type)}"></use></svg>
${escapeHtml(item.content)}</div>`;
                });
                backlinksHTML += "</div>";
            });
        } else {
            (data.backlinks as IAllBacklinks[]).forEach((item) => {
                backlinksHTML += `<div class="item"><div class="item__path fn__ellipsis">${escapeHtml(path.posix.join(path.posix.basename(item.def.url), item.def.path))}</div><div data-open="true" class="item__content fn__a fn__two-line" data-url="${encodeURIComponent(item.def.url)}" data-path="${encodeURIComponent(item.def.path)}" data-id="${item.def.id}" data-type="${item.def.type}">
<svg><use xlink:href="#${getIconByType(item.def.type)}"></use></svg>
${escapeHtml(item.def.content)}</div>`
                item.refs.forEach((ref) => {
                    backlinksHTML += `<div  data-open="true" style="font-size: 12px" class="item__content item__content--ref fn__a fn__ellipsis" data-url="${encodeURIComponent(ref.url)}" data-path="${encodeURIComponent(ref.path)}" data-id="${ref.id}" data-type="${ref.type}">
<svg><use xlink:href="#${getIconByType(ref.type)}"></use></svg>
${escapeHtml(ref.content)}</div>`;
                })
                backlinksHTML += "</div>";
            });
        }

        if (data.backlinks.length === 0) {
            backlinksHTML += `<div class="item"><div class="item__content">${i18n[window.liandi.config.lang].noBacklinks}</div></div>`;
        }

        this.element.innerHTML = backlinksHTML;
    }
}
