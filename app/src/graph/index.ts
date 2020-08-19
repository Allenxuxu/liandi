import * as echarts from "echarts";
import * as path from "path";
import {i18n} from "../i18n";
import {escapeHtml} from "../util/escape";
import {WebSocketUtil} from "../websocket";
import {Model} from "../layout/Model";
import {Tab} from "../layout/Tab";
import {processMessage} from "../util/processMessage";

export class Graph extends Model {
    private inputElement: HTMLInputElement;
    private graphElement: HTMLDivElement;
    private chart: echarts.ECharts

    constructor(tab: Tab) {
        super({
            id: tab.id,
            callback() {
                this.send("graph", {
                    k: tab.model.inputElement.value
                });
            }
        });

        this.ws.onmessage = (event) => {
            const data = processMessage(event.data, this.reqId)
            if (data) {
                switch (data.cmd) {
                    case "graph":
                        this.onGraph(data.data);
                        break;
                }
            }
        }

        tab.panelElement.classList.add("graph");
        this.graphElement = tab.panelElement.lastElementChild as HTMLDivElement;
        this.inputElement = tab.panelElement.firstElementChild.firstElementChild as HTMLInputElement;
        this.inputElement.placeholder = i18n[window.liandi.config.lang].search;
        this.inputElement.addEventListener("compositionend", () => {
            this.render(window.liandi);
        });
        this.inputElement.addEventListener("input", (event: InputEvent) => {
            if (event.isComposing) {
                return;
            }
            this.render(window.liandi);
        });
    }

    render(liandi: ILiandi) {
        if (this.graphElement.parentElement.style.display === "flex") {
            liandi.ws.send("graph", {
                k: this.inputElement.value
            });
        }
    }

    resize() {
        if (this.chart && this.graphElement.parentElement.style.display === "flex") {
            this.chart.resize();
        }
    }

    onGraph(data: { nodes: Record<string, unknown>[], links: Record<string, unknown>[] }) {
        if (!this.chart) {
            this.chart = echarts.init(this.graphElement);
        } else {
            this.resize();
        }
        this.chart.setOption({
                legend: {
                    data: [{
                        name: i18n[window.liandi.config.lang].rootBlock,
                        icon: "circle"
                    }, {
                        name: i18n[window.liandi.config.lang].normalBlock,
                        icon: "circle"
                    }, {
                        name: i18n[window.liandi.config.lang].relativeBlock,
                        icon: "circle"
                    }],
                    top: 20,
                    right: 20,
                    orient: "vertical",
                    textStyle: {
                        padding: [2, 4, 2, 4],
                        color: "#d1d5da",
                        backgroundColor: "rgba(68, 77, 86, .68)",
                        borderRadius: 3,
                        lineHeight: 14,
                        fontSize: 12,
                    },
                    inactiveColor: "#959da5",
                },
                tooltip: {
                    textStyle: {
                        color: "#d1d5da",
                    },
                    backgroundColor: "rgba(36, 41, 46, .86)",
                    padding: [2, 4, 2, 4],
                    formatter: (params: IEchartsFormatter) => {
                        if (params.dataType === "edge") {
                            return `<div style="font-size: 10px;line-height: 12px">${params.data.lineStyle.type === "dotted" ? i18n[window.liandi.config.lang].relativeRelation : i18n[window.liandi.config.lang].parentRelation}</div>`;
                        } else {
                            return `<div style="font-size: 12px;line-height: 14px; word-break: break-all;width: 220px;white-space: normal;">${params.data.category === 3 ? "This is a bug block, please go to https://github.com/88250/window.liandi/issues/new for feedback" : escapeHtml(params.data.content)}</div>
<div style="font-size: 10px;color:#959da5;line-height: 12px">${params.data.name}</div>`;
                        }
                    },
                },
                series: [
                    {
                        animation: false,
                        categories: [{
                            name: i18n[window.liandi.config.lang].rootBlock,
                            itemStyle: {
                                color: "#161719"
                            },
                        }, {
                            name: i18n[window.liandi.config.lang].normalBlock,
                            itemStyle: {
                                color: "#7c828b"
                            },
                        }, {
                            name: i18n[window.liandi.config.lang].relativeBlock,
                            itemStyle: {
                                color: "#d23f31"
                            },
                        }, {
                            name: "bug",
                            itemStyle: {
                                color: "#ea4aaa"
                            },
                        }],
                        draggable: true,
                        label: {
                            position: "right",
                            padding: [2, 4, 2, 4],
                            color: "#d1d5da",
                            backgroundColor: "rgba(68, 77, 86, .68)",
                            fontSize: 10,
                            borderRadius: 3,
                            lineHeight: 12,
                            formatter: (params: IEchartsFormatter) => {
                                if (params.data.category === 0) {
                                    return path.posix.basename(params.data.path);
                                } else {
                                    return params.data.content.substr(0, 8);
                                }
                            },
                        },
                        symbolSize: (value: number, params: IEchartsFormatter) => {
                            if (params.data.category === 0) {
                                return 18;
                            } else {
                                return 12;
                            }
                        },
                        force: {
                            repulsion: 100,
                            edgeLength: [30, 100],
                            // @ts-ignores
                            friction: 0.15
                        },
                        type: "graph",
                        layout: "force",
                        focusNodeAdjacency: true,
                        roam: true,
                        itemStyle: {
                            borderColor: "rgba(255, 255, 255, 0.38)",
                            borderWidth: 1,
                        },
                        lineStyle: {
                            color: "source",
                            curveness: 0,
                            opacity: 0.48,
                        },
                        emphasis: {
                            lineStyle: {
                                width: 3
                            },
                            itemStyle: {
                                borderColor: "#fff",
                            },
                            label: {
                                show: true
                            }
                        },
                        edgeSymbol: ["none", "arrow"],
                        edgeSymbolSize: [0, 8],
                        data: data.nodes,
                        links: data.links,
                    }
                ]
            }
        );

        this.chart.on("click", (params: IEchartsFormatter) => {
            if (params.dataType === "node" && params.data.label.show) {
                // window.liandi.editors.open(window.liandi, params.data.url, params.data.path);
            }
        });
    }
}
