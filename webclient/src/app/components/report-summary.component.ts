import {AfterViewInit, Component, OnDestroy} from '@angular/core';
import {ReportService} from "../services/report.service";
import {D3, D3Service} from "d3-ng2-service";
import {NlpControl} from "../model/nlp-control";
import {ReportUtils} from "../util/report-utils";

declare let Spinner: any;

@Component({
    selector: 'report-summary-card',
    templateUrl: '../views/report-summary-card.component.html'
})
export class ReportSummaryComponent implements AfterViewInit, OnDestroy {
    //template accessible fields
    reportService: ReportService;
    //Non-UMD d3
    private d3: D3;
    //fields
    private root: any;
    private space: any;
    private spinner: any;
    private data: any;
    private linkStrength: any;
    private queryIndices: any;
    private topicIndices: any;
    private linkScale: any;
    private indicatorUnit: any;
    //fields with default values
    private domainWidth: number = 256;
    //constants
    private readonly margin: number = 40;
    private readonly cornerRadius: number = 3;
    private readonly relationWidth: number = 256;
    private readonly entityHeight: number = 45;
    private readonly entitySpacing: number = 1;
    private readonly bundleHeight: number = 48;
    private readonly bundleSpacing: number = 8;
    private readonly sortMode: string = 'label';
    private readonly edgeMode: string = 'edges';
    private readonly minBundleSources: number = 2;
    private readonly minBundleTargets: number = 2;
    private readonly minBundleSize: number = 0;

    constructor(reportService: ReportService, d3Service: D3Service) {
        this.reportService = reportService;
        this.d3 = d3Service.getD3();
    }

    private static transform(x: number, y: number, scale: number): string {
        return `translate(${x}, ${y}) scale(${scale})`;
    }

    private static translate(x: number, y: number): string {
        return ReportSummaryComponent.transform(x, y, 1);
    }

    private static link(x0: number, y0: number, x1: number, y1: number): string {
        let xm = (x0 + x1) / 2;
        return `M ${x0} ${y0} C ${xm} ${y0} ${xm} ${y1} ${x1} ${y1}`;
    }

    ngAfterViewInit(): void {
        console.log("Summary view initialized... Creating summary");
        this.createGlobalSummary(this.reportService.currentTopicModellingLib, this.reportService.topicModellingParamTopicCount, this.reportService.topicModellingParamTermsEach);
    }

    ngOnDestroy(): void {
        console.log("Destroying global summary view... Ready for redraw.");
        /* //the following happens anyway since view is destroyed, duh
        let bisetContainer = $('#biset-container');
        if (bisetContainer.length) {
            bisetContainer.empty();
        }*/
    }


    /**
     * Non-static method to create a global summary based on currently loaded report documents
     * @param {string} topicModellingLib Optional parameter to set library for topic modelling
     */
    createGlobalSummary(topicModellingLib?: string, topicCount?: number, termsEach?: number): void {
        if (!this.reportService.showSummary) {
            console.log("No summary since not enabled.");
            return;
        }
        let report = this.reportService.report;
        if (!report || !report.items || report.items.length == 0) {
            console.error("ReportService.createGlobalSummary: No report document data to be processed!");
            return;
        }

        let textStreams = this.reportService.finalTextStreams;
        //Prepare document contents and titles
        let allDocumentTitles: string[] = [];
        let allDocumentContents: string[] = [];
        if (!textStreams || textStreams.length == 0) {
            for (let reportEntry of report.items) {
                allDocumentTitles.push(reportEntry.title);
                allDocumentContents.push(reportEntry.content);
                allDocumentContents = ReportUtils.removeHtmlTagsFromStringArray(allDocumentContents);
            }
        } else {
            if (textStreams.length != report.items.length) {
                throw Error("Processed text stream results don't match documents (size)!");
            }
            for (let i = 0; i < report.items.length; i++) {
                allDocumentTitles.push(report.items[i].title);
                allDocumentContents.push(textStreams[i].join(" "));
            }
        }

        /*this.getTermDocumentMatrix(allDocumentContents).then(res => { //remote term document matrix retrieval
            console.log("text-miner result: ");
            console.log(res);
        });*/

        if (!termsEach) {
            termsEach = NlpControl.TOPIC_PARAM_TERMS_EACH_DEFAULT;
        }
        if (!topicCount) {
            topicCount = NlpControl.TOPIC_PARAM_COUNT_DEFAULT;
        }

        this.performGlobalTopicAnalysis(allDocumentContents,
            topicModellingLib ? topicModellingLib : NlpControl.LIB_LDA_REMOTE,
            topicCount,
            termsEach,
            allDocumentTitles);
    }

    /*----------------------------------
    The following code is the nmf vis implementation
    Based on BiSet edge bundeling by Lukas Eibensteiner and Manuel Kapferer (https://github.com/eibens/biset)
    and adaptations by Michael Mazurek (https://www.cg.tuwien.ac.at/staff/MichaelMazurek.html)
    */

    /**
     * @param queries Is are the names of the search queries or document titles that lead to those topics
     * @param topics Are the resulting topics from a document
     * @param entities Are the pairs between queries/titles and topics
     * @param links Strength of link between pairs
     */
    startWithData(queries: any, topics: any, entities: any, links: any) {
        this.spinner.stop();

        this.linkStrength = links;
        this.queryIndices = queries; //Titles
        this.topicIndices = topics;
        this.data = this.transformCsv(entities);

        this.draw();
    }

    /**
     * Updates the whole visualization.
     */
    draw() {
        let data = this.data;

        // Clear space
        this.space.html("");

        // Calculate domain for link scaling
        let maxStr: any = this.d3.max([].concat.apply([], this.linkStrength));
        let minStr: any = this.d3.min([].concat.apply([], this.linkStrength));
        this.linkScale = this.d3.scaleLinear()
            .domain([minStr, maxStr])
            .range([1, 15]);

        // Calculate domain width
        let text = this.root.append('text')
            .attr("class", "remove")
            .text('')
            .attr("font-size", "16px");
        let textLengthArr: number[] = [];
        data.domains.forEach((domain: any) => {
            domain.entities.forEach((entity: any) => {
                text.text(entity.label);
                let bbox = text.node().getBBox();
                textLengthArr.push(bbox.width);
            });
        });
        this.domainWidth = this.d3.max(textLengthArr) + 15;
        this.root.selectAll(".remove").remove();

        let maxEntityFrequency: any = this.d3.max(this.data.entities, (e: any) => e.frequency);
        this.indicatorUnit = 40 / maxEntityFrequency;

        // Apply dynamic data transformations.
        this.sortEntities(data.domains, this.sortMode);
        this.layoutBundles(data.relations, this.minBundleSources,
            this.minBundleTargets, this.minBundleSize);
        this.hideLinks(data.relations, this.edgeMode);
        this.updateSelection();

        // Draw the actual visualization.
        let space = this.space;
        this.drawRelations(space, data.relations);
        this.drawDomains(space, data.domains);
    }

    /**
     * Deselects all selected entities and bundles.
     */
    clearSelection() {
        //this.data.bundles.forEach(b => b.selected = false);
        this.data.entities.forEach((b: any) => b.selected = false);
        this.updateSelection();
    }

    private performGlobalTopicAnalysis(documentContents: string[], library: string, topicCount: number, termsEach: number, documentTitles: string[]): void {
        this.reportService.currentTopicModellingLib = library;
        switch (library) {
            case NlpControl.LIB_LDA_REMOTE:
                this.reportService.getLda(documentContents, topicCount, termsEach).then(res => {
                    this.reportService.lastGlobalLdaResult = res;
                });
                break;
            case NlpControl.LIB_NMF:
                this.reportService.lastGlobalNmfResult = ReportUtils.nmfTopicModelling(documentContents, topicCount, termsEach, documentTitles, this.reportService.posSelection);

                const containerId: string = '#summary-vis-container';
                let visContainer = $(containerId);
                if (visContainer.length) {
                    visContainer.empty();
                }
                let height: number = 200 + documentContents.length * 40; //dynamic height calculation depending on number of titles
                this.prepareGlobalNmfVis(this.reportService.lastGlobalNmfResult, documentTitles, containerId, 1440, height);

                break;
        }
    }

    private prepareGlobalNmfVis(nmfResult: any, docTitles: string[], containerId: string, width: number, height: number): void {
        let bisetAnchor: any = this.d3.select(containerId)
            .append('div')
            .style("position", "relative")
            .style('margin', "8px 8px 0 2px")
            .style('box-shadow', "0 2px 2px 0 rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.09)");
        this.initNmfVis(bisetAnchor, width, height);

        let topics: string[] = [];
        for (let topic of nmfResult.topicEstimation) {
            let topicJoin: string = "";
            for (let termScorePair of topic) {
                topicJoin += " " + termScorePair.term;
            }
            topics.push(topicJoin.trim());
        }
        //creating a cartesian product of titles and topic keywords
        let titleTopicPairs: any[] = [];
        for (let title of docTitles) {
            for (let topic of topics) {
                titleTopicPairs.push({"title": title, "topics": topic});
            }
        }
        titleTopicPairs["columns"] = ["title", "topics"];

        this.startWithData(docTitles, topics, titleTopicPairs, nmfResult.H);
    }

    private initNmfVis(root: any, width: number, height: number): void {
        this.root = root
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .style("z-index", "-1");

        this.space = this.drawSpace(this.root, this.margin);

        let sph = height / 2;
        let spw = width / 2;
        let opts = {
            lines: 9, // The number of lines to draw
            length: 9, // The length of each line
            width: 5, // The line thickness
            radius: 14, // The radius of the inner circle
            color: '#4585F4', // #rgb or #rrggbb or array of colors
            speed: 2.0, // Rounds per second
            trail: 48, // Afterglow percentage
            className: 'spinner', // The CSS class to assign to the spinner
            top: sph + "px",
            left: spw + "px"
        };

        let target = root.node();
        this.spinner = new Spinner(opts).spin(target);
    }

    private selectLinksByEntityId(id: number) {
        return this.root.selectAll(`.link[data-source="${id}"], .link[data-target="${id}"]`);
    }

    private selectLinksByBundleId(id: number) {
        return this.root.selectAll(`.link[data-bundle="${id}"]`);
    }

    private handleEntityMouseOver(self: any) {
        return function () {
            let node = self.d3.select(this.parentNode);
            node.classed("highlighted", true);
            let id = node.attr("data-id");
            self.selectLinksByEntityId(id)
                .classed("highlighted", true);
        };
    }

    private handleEntityMouseOut(self: any) {
        return function () {
            let node = self.d3.select(this.parentNode);
            node.classed("highlighted", false);
            let id = node.attr("data-id");
            self.selectLinksByEntityId(id)
                .classed("highlighted", false);
        };
    }

    private handleBundleMouseOver(self: any) {
        return function () {
            let node = self.d3.select(this.parentNode);
            node.classed("highlighted", true);
            let id = node.attr("data-id");
            self.selectLinksByBundleId(id)
                .classed("highlighted", true);
        };
    }

    private handleBundleMouseOut(self: any) {
        return function () {
            let node = self.d3.select(this.parentNode);
            node.classed("highlighted", false);
            let id = node.attr("data-id");
            self.selectLinksByBundleId(id)
                .classed("highlighted", false);
        };
    }

    private handleEntityClick(self: any) {
        return function () {
            let node = self.d3.select(this.parentNode);
            let id = node.attr("data-id");
            let entity = self.data.entities.filter((e: any) => e.id == id)[0];
            entity.selected = !entity.selected;
            self.updateSelection();
        };
    }

    private handleBundleClick(self: any) {
        return function () {
            let node = self.d3.select(this.parentNode);
            let id = node.attr("data-id");
            let bundle = self.data.bundles.filter((b: any) => b.id == id)[0];
            bundle.selected = !bundle.selected;
            self.updateSelection();
        };
    }

    private sortEntities(domains: any, mode: any) {
        let labelSort = (a: any, b: any) => a.label.localeCompare(b.label);

        let frequencySort = (a: any, b: any) => {
            let sort = b.frequency - a.frequency;
            // Fallback to alphabetic sort for entities with equal frequency.
            return sort != 0 ? sort : labelSort(a, b);
        };

        //No rank definitions here
        this.data.entities.forEach((e: any): any => {
            return e.rank = undefined;
        });

        // Sanity check entities for rank
        this.data.entities.forEach((e: any) => {
            if (e.rank === undefined) {
                e.rank = 0;
            }
        });

        let prioritySort = (a: any, b: any) => {
            let s = b.rank - a.rank;
            if (s != 0) {
                return s;
            }
            return frequencySort(a, b);
        };

        let sort = frequencySort;
        switch (mode) {
            case 'label':
                sort = labelSort;
                break;
            case 'priority':
                sort = prioritySort;
                break;
            case 'frequency':
                sort = frequencySort;
                break;
            default:
                throw new Error("Unknown sort mode.");
        }

        domains.forEach((domain: any) => {
            domain.entities.sort(sort).forEach((entity: any, i: number) => {
                entity.position = i;
            });
        });
    }

    private layoutBundles(relations: any, minSources: any, minTargets: any, minSize: any) {
        let self: any = this;
        relations.forEach((relation: any) => {
            relation.bundles.forEach((bundle: any) => {
                // Bundle position is average of connected entity positions.
                let entities = bundle.sources.concat(bundle.targets);
                bundle.position = self.d3.mean(entities, (e: any) => e.position);

                // Filter bundles.
                let hasMinSources = bundle.sources.length >= minSources;
                let hasMinTargets = bundle.targets.length >= minTargets;
                let hasMinSize = entities.length >= minSize;
                let bundlesEnabled = this.edgeMode == 'bundles' || this.edgeMode == 'hybrid';
                bundle.visible = bundlesEnabled && hasMinSources && hasMinTargets && hasMinSize;
            });

            let visibleBundles = relation.bundles
                .filter((b: any) => b.visible)
                .sort((a: any, b: any) => a.position - b.position);

            let oldCenter = this.d3.mean(visibleBundles, (b: any) => b.position);

            // Move bundles downwards if they overlap with the one before them.
            let spacing = this.bundleHeight / this.entityHeight;
            for (let i = 1; i < visibleBundles.length; i++) {
                let prev = visibleBundles[i - 1];
                let curr = visibleBundles[i];
                curr.position = Math.max(prev.position + spacing, curr.position);
            }

            // Move all bundles so that the center of gravity is the same as before.
            let newCenter = this.d3.mean(visibleBundles, (b: any) => b.position);
            let correction = oldCenter - newCenter;
            visibleBundles.forEach((b: any) => b.position += correction);
        });
    }

    private hideLinks(relations: any, edgeMode: string) {
        relations.forEach((relation: any) => {
            let visibleBundles = relation.bundles.filter((b: any) => b.visible);
            relation.links.forEach((link: any) => {
                link.visible = edgeMode == 'edges' || edgeMode == 'hybrid';

                // In hybrid mode we hide all links that are expressed by a bundle.
                if (edgeMode == 'hybrid') {
                    visibleBundles.forEach((bundle: any) => {
                        let containsSource = bundle.sources.indexOf(link.source) != -1;
                        let containsTarget = bundle.targets.indexOf(link.target) != -1;
                        if (containsSource && containsTarget) {
                            link.visible = false;
                        }
                    });
                }
            });
        });
    }

    private updateSelection() {
        let data = this.data;
        let applyFocus = (element: any, array: any) => array
            .filter((x: any, i: number, self: any) => self.indexOf(x) === i)
            .filter((x: any) => x.selected)
            .filter((x: any) => x !== element)
            .forEach((x: any) => element.focus++);

        data.entities.forEach((entity: any) => {
            entity.focus = entity.selected ? 1 : 0;
            applyFocus(entity, entity.sources);
            applyFocus(entity, entity.targets);
            applyFocus(entity, entity.bundles);
        });

        /*data.bundles.forEach(bundle => {
         bundle.focus = bundle.selected ? 1 : 0;
         applyFocus(bundle, bundle.sources);
         applyFocus(bundle, bundle.targets);
         });*/

        let linkFocus = (a: any, b: any) => Math.min(a.focus, b.focus);
        data.relations.forEach((relation: any) => {
            relation.links.forEach((link: any) => {
                link.focus = linkFocus(link.source, link.target);
            });
            relation.sourceLinks.forEach((link: any) => {
                link.focus = linkFocus(link.entity, link.bundle);
            });
            relation.targetLinks.forEach((link: any) => {
                link.focus = linkFocus(link.entity, link.bundle);
            });
        });

        this.d3.selectAll(".entity")
            .classed("selected", (d: any) => d.selected)
            .attr("data-focus", (d: any) => d.focus);

        this.d3.selectAll(".bundle")
            .classed("selected", (d: any) => d.selected)
            .attr("data-focus", (d: any) => d.focus);

        this.d3.selectAll(".link")
            .attr("data-focus", (d: any) => d.focus);
    }

    private relationScaleX(): any {
        let halfRelationWidth = this.relationWidth / 2;
        return this.d3.scaleLinear()
            .domain([-1, 1])
            .range([-halfRelationWidth, halfRelationWidth]);
    }

    private relationScaleY(): any {
        return this.d3.scaleLinear()
            .domain([0, 1])
            .range([0, this.entityHeight]);
    }

    private drawSpace(root: any, offset: number): any {
        // Build hierarchy.
        let zoomContainer = root.append("g")
            .classed("zoom-container", true);
        let offsetContainer = zoomContainer.append("g")
            .classed("offset-container", true);

        // Static transforms.
        offsetContainer.attr("transform", ReportSummaryComponent.transform(offset, offset, 1));

        return offsetContainer;
    }

    private drawDomains(root: any, domains: any) {
        let self = this;
        let selection = root
            .selectAll(".domain")
            .data(domains);

        // Container
        selection.enter()
            .append("g")
            .classed("domain", true)
            .attr("transform", (d: any, i: any) => {
                let x = i * (this.domainWidth + this.relationWidth);
                return ReportSummaryComponent.translate(x, 0);
            })
            .each(function (domain: any) {
                self.drawEntities(self.d3.select(this), domain.entities);
            });
    }

    private drawEntities(root: any, entities: any) {
        let selection = root
            .selectAll(".entity")
            .data(entities);


        // Container
        let contents = selection.enter()
            .filter((elem: any) => {
                return elem.domain.label == "title";
            })
            .append("g")
            .classed("entity", true)
            .classed("selected", (d: any) => d.selected)
            .attr("data-id", (d: any) => d.id)
            .attr("data-focus", (d: any) => d.focus)
            .attr("transform", (d: any, i: number) => ReportSummaryComponent.translate(0, i * this.entityHeight));

        selection.enter()
            .filter((elem: any) => {
                return (elem.domain.label != "title");
            })
            .append("g")
            .classed("entity", true)
            .classed("selected", (d: any) => d.selected)
            .attr("data-id", (d: any) => d.id)
            .attr("data-focus", (d: any) => d.focus)
            .attr("transform", (d: any, i: number) => ReportSummaryComponent.translate(0, i * this.entityHeight));

        contents = root.selectAll(".entity");

        // Background
        contents.append("rect")
            .classed("background", true)
            .attr("width", this.domainWidth)
            .attr("height", this.entityHeight - this.entitySpacing)
            .attr("rx", this.cornerRadius)
            .attr("ry", this.cornerRadius)
            .on("mouseover", this.handleEntityMouseOver(this))
            .on("mouseout", this.handleEntityMouseOut(this))
            .on("mousedown", this.handleEntityClick(this));

        // Label
        contents
            .append("text")
            .classed("text", true)
            .attr("x", 12)
            .attr("y", this.entityHeight / 2 + 5)
            .attr("font-size", "16px")
            .attr("fill", "rgba(0, 0, 0, 0.87")
            .text((d: any) => d.label);
    }

    private drawRelations(root: any, relations: any) {
        let self = this;
        let selection = root
            .selectAll(".relation")
            .data(relations);

        selection.enter()
            .append("g")
            .classed("relation", true)
            .attr("transform", (d: any, i: number) => {
                let x = (i + 1) * this.domainWidth + (i + 0.5) * this.relationWidth;
                let y = this.entityHeight / 2;
                return ReportSummaryComponent.translate(x, y);
            })
            .each(function (relation: any) {
                let node = self.d3.select(this);
                self.drawSoloLinks(node, relation.links);
                self.drawSourceLinks(node, relation.sourceLinks);
                self.drawTargetLinks(node, relation.targetLinks);
                self.drawBundles(node, relation.bundles);
            });
    }

    private drawBundles(root: any, bundles: any) {
        let scaleX = this.relationScaleX();
        let scaleY = this.relationScaleY();
        let width = (bundle: any) => this.indicatorUnit * bundle.size;

        let selection = root
            .selectAll(".bundle")
            .data(bundles.filter((b: any) => b.visible));

        let containers = selection.enter()
            .append("g")
            .classed("bundle", true)
            .classed("selected", (d: any) => d.selected)
            .attr("data-id", (d: any) => d.id)
            .attr("data-focus", (d: any) => d.focus)
            .attr("transform", (d: any) => {
                let x = scaleX(0) - width(d) / 2;
                let y = scaleY(d.position) - this.bundleHeight / 2;
                return ReportSummaryComponent.translate(x, y);
            });

        containers.append("rect")
            .classed("background", true)
            .attr("width", width)
            .attr("height", this.bundleHeight - this.bundleSpacing)
            .attr("rx", this.cornerRadius)
            .attr("ry", this.cornerRadius)
            .on("mouseover", this.handleBundleMouseOver(this))
            .on("mouseout", this.handleBundleMouseOut(this))
            .on("mousedown", this.handleBundleClick(this));

        containers.append("rect")
            .classed("indicator", true)
            .attr("width", (d: any) => d.sources.length / d.size * width(d))
            .attr("height", this.bundleHeight - this.bundleSpacing)
            .attr("rx", this.cornerRadius)
            .attr("ry", this.cornerRadius);

        containers.append("title")
            .text((d: any) => `${d.sources.length}/${d.targets.length}`);
    }

    private drawSoloLinks(root: any, links: any) {
        let self = this;
        let scaleX = this.relationScaleX();
        let scaleY = this.relationScaleY();

        let selection = root
            .selectAll(".solo-link")
            .data(links.filter((l: any) => l.visible));
        selection.enter()
            .append("path")
            .classed("link", true)
            .classed("solo-link", true)
            .style("stroke-width", (d: any) => {
                let sdom = d.source.domain.label;
                let sname = d.source.label;
                let sindex = (sdom == "title") ? self.queryIndices.indexOf(sname) : self.topicIndices.indexOf(sname);
                if (sindex == -1) {
                    console.error("Could not find index of title " + sname);
                }

                let tdom = d.target.domain.label;
                let tname = d.target.label;
                let tindex = (tdom == "title") ? self.queryIndices.indexOf(tname) : self.topicIndices.indexOf(tname);
                if (tindex == -1) {
                    console.error("Could not find index of title " + tname);
                }
                return (sdom == "title") ? self.linkScale(self.linkStrength[tindex][sindex]) : self.linkScale(self.linkStrength[sindex][tindex]);
            })
            .attr("data-id", (d: any) => d.id)
            .attr("data-source", (d: any) => d.source.id)
            .attr("data-target", (d: any) => d.target.id)
            .attr("data-focus", (d: any) => d.focus)
            .attr("d", (d: any) => ReportSummaryComponent.link(
                scaleX(-1),
                scaleY(d.source.position),
                scaleX(1),
                scaleY(d.target.position)
            ));
    }

    private drawSourceLinks(root: any, links: any) {
        let scaleX = this.relationScaleX();
        let scaleY = this.relationScaleY();

        let selection = root
            .selectAll(".source-link")
            .data(links.filter((l: any) => l.bundle.visible));
        selection.enter()
            .append("path")
            .classed("link", true)
            .classed("source-link", true)
            .attr("data-id", (d: any) => d.id)
            .attr("data-source", (d: any) => d.entity.id)
            .attr("data-bundle", (d: any) => d.bundle.id)
            .attr("data-focus", (d: any) => d.focus)
            .attr("d", (d: any) => ReportSummaryComponent.link(
                -d.bundle.size * this.indicatorUnit / 2,
                scaleY(d.bundle.position),
                scaleX(-1),
                scaleY(d.entity.position)
            ));

        let sel = root.selectAll(".source-link");
    }

    private drawTargetLinks(root: any, links: any) {
        let scaleX = this.relationScaleX();
        let scaleY = this.relationScaleY();

        let selection = root
            .selectAll(".target-link")
            .data(links.filter((l: any) => l.bundle.visible));
        selection.enter()
            .append("path")
            .classed("link", true)
            .classed("target-link", true)
            .attr("data-id", (d: any) => d.id)
            .attr("data-target", (d: any) => d.entity.id)
            .attr("data-bundle", (d: any) => d.bundle.id)
            .attr("data-focus", (d: any) => d.focus)
            .attr("d", (d: any) => ReportSummaryComponent.link(
                d.bundle.size * this.indicatorUnit / 2,
                scaleY(d.bundle.position),
                scaleX(1),
                scaleY(d.entity.position)
            ));
    }

    private transformCsv(csv: any): any {
        if (csv.length == 0) throw Error('No entries in data.');

        // Extract domains.
        let domainId = 1;
        let domains = this.d3.keys(csv[0]).map(label => ({
            id: domainId++,
            label: label,
        }));

        let self: any = this;
        // Extract entities
        let entityId = 1;
        let entities = domains.map((domain: any) => {
            domain.entities = [];
            csv.forEach((row: any) => {
                let label = row[domain.label];
                if (domain.entities[label] === undefined) {
                    domain.entities[label] = {
                        id: entityId++,
                        label: label,
                        domain: domain,
                        sources: [],
                        targets: [],
                        bundles: [],
                        frequency: 0,
                    };
                }
                domain.entities[label].frequency++;
            });
            domain.entities = self.d3.values(domain.entities);
            return domain.entities;
        }).reduce((acc, e) => acc.concat(e), []);

        // Extract relations.
        let relationId = 1;
        let relations: any[] = [];
        for (let i = 1; i < domains.length; i++) {
            let source: any = domains[i - 1];
            let target: any = domains[i];
            let relation: any = {
                id: relationId++,
                source: source,
                target: target,
                links: [],
                sourceLinks: [],
                targetLinks: [],
                bundles: [],
            };
            source.targetRelation = relation;
            target.sourceRelation = relation;
            if (!source.sourceRelation) {
                source.sourceRelation = null;
            }
            if (!target.targetRelation) {
                target.targetRelation = null;
            }
            relations.push(relation);
        }

        // Extract links.
        let findFirst = (array: any, predicate: any) => {
            for (let i = 0; i < array.length; i++) {
                if (predicate(array[i])) return array[i];
            }
            return null;
        };
        let linkId = 1;
        csv.forEach((row: any) => {
            relations.forEach(relation => {
                let sourceLabel = row[relation.source.label];
                let targetLabel = row[relation.target.label];
                let source = findFirst(relation.source.entities, (e: any) => e.label == sourceLabel);
                let target = findFirst(relation.target.entities, (e: any) => e.label == targetLabel);
                if (source == null) throw Error(`Entity with label "${sourceLabel}" not found in domain "${relation.source.label}"`);
                if (target == null) throw Error(`Entity with label "${targetLabel}" not found in domain "${relation.target.label}"`);
                source.targets.push(target);
                target.sources.push(source);
                relation.links.push({
                    id: linkId++,
                    relation: relation,
                    source: source,
                    target: target,
                    bundled: false,
                });
            });
        });

        return {
            domains: domains,
            relations: relations,
            entities: entities,
            bundles: undefined
        };
    }


}