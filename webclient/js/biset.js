/**
 * Biset visualization for relational data.
 * Code based on GSearch Chrome Extension project.
 * Modified by Martin
 */
class Biset {

    /**
     * Creates a new Biset visualization.
     * @param root SVG element in which the visualization should be rendered
     */
    constructor(root, width, height) {
        this._root = root
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .style("z-index", "-1");
        this.zoomRange = [0.5, 1.5];
        this.margin = 40;
        this.cornerRadius = 4;
        this.domainWidth = 200;
        this.relationWidth = 200;
        this.entityHeight = 40;
        this.entitySpacing = 1;
        this.indicatorWidth = 40;
        this.bundleHeight = 48;
        this.bundleSpacing = 8;
        this.sortMode = 'label';
        this.edgeMode = 'edges';
        this.minBundleSources = 2;
        this.minBundleTargets = 2;
        this.minBundleSize = 0;

        this._space = this._drawSpace(this._root, this._margin, this._zoomRange);

        let sph = height / 2;
        let spw = width / 2;
        let opts = {
            lines: 9, // The number of lines to draw
            length: 9, // The length of each line
            width: 5, // The line thickness
            radius: 14, // The radius of the inner circle
            color: '#4585F4', // #rgb or #rrggbb or array of colors
            speed: 1.9, // Rounds per second
            trail: 40, // Afterglow percentage
            className: 'spinner', // The CSS class to assign to the spinner
            top: sph + "px",
            left: spw + "px"
        };

        let target = root.node();
        this.spinner = new Spinner(opts).spin(target);
    }

    /**
     * Set the visualization data in the format returned by d3's parse functions.
     * @param value csv
     */
    set data(value) {
        this._data = Biset.transformCsv(value);
    }

    /**
     * Set the minimum and maximum scale for zooming as a pair of values.
     * @param value {Array}
     */
    set zoomRange(value) {
        this._zoomRange = value;
    }

    /**
     * Set the initial offset of the visualization from the top left corner.
     * @param value {int}
     */
    set margin(value) {
        this._margin = value;
    }

    /**
     * Set the corner radius for entities and bundles.
     * @param value {int}
     */
    set cornerRadius(value) {
        this._cornerRadius = value;
    }

    /**
     * Set the width of the domain columns.
     * @param value {int}
     */
    set domainWidth(value) {
        this._domainWidth = value;
    }

    /**
     * Set the width of the area between domain columns.
     * @param value {int}
     */
    set relationWidth(value) {
        this._relationWidth = value;
    }

    /**
     * Set the height of entities.
     * @param value {int}
     */
    set entityHeight(value) {
        this._entityHeight = value;
    }

    /**
     * Set the height removed from the bottom of each entity.
     * @param value {int}
     */
    set entitySpacing(value) {
        this._entitySpacing = value;
    }

    /**
     * Set the width taken up by the entity frequency indicator.
     * @param value {int}
     */
    set indicatorWidth(value) {
        this._indicatorWidth = value;
    }

    /**
     * Set the height of bundles.
     * @param value {int}
     */
    set bundleHeight(value) {
        this._bundleHeight = value;
    }

    /**
     * Set the height removed from the bottom of each bundle.
     * @param value {int}
     */
    set bundleSpacing(value) {
        this._bundleSpacing = value;
    }

    /**
     * Set the sort mode which is 'frequency', 'label', or 'priority'.
     * @param value {string}
     */
    set sortMode(value) {
        this._sortMode = value;
    }

    /**
     * Set the edge display mode which is 'edges', 'bundles', or 'hybrid'.
     * @param value {string}
     */
    set edgeMode(value) {
        this._edgeMode = value;
    }

    /**
     * Set the minimum number of entities on the left side of a bundle.
     * @param value {int}
     */
    set minBundleSources(value) {
        this._minBundleSources = value;
    }

    /**
     * Set the minimum number of entities on the right side of a bundle.
     * @param value {int}
     */
    set minBundleTargets(value) {
        this._minBundleTargets = value;
    }

    /**
     * Set the minimum bundle size.
     * @param value {int}
     */
    set minBundleSize(value) {
        this._minBundleSize = value;
    }

    /**
     * @param queries Is are the names of the search queries or document titles that lead to those topics
     * @param topics Are the resulting topics from a document
     * @param entities Are the pairs between queries/titles and topics
     * @param links Strength of link between pairs
     */
    startWithData(queries, topics, entities, links) {
        this.spinner.stop();

        this._linkStrength = links;
        this._queryIndices = queries; //Titles
        this._topicIndices = topics;
        this.data = entities;

        this.draw();

        // dispatch a click onto main query
        let selection = this._root.selectAll("rect[class='background']");
        let mainEntity = selection.filter((elem) => (elem.id == 1) ? true : false);
        mainEntity.each(function (d, i) {
            let onClickFunction = d3.select(this).on("mousedown");
            onClickFunction.apply(this, [d, i]);
        });
        selection.on("mousedown", null);
    }

    /**
     * Updates the whole visualization.
     */
    draw() {
        let data = this._data;

        // Clear space
        this._space.html("");

        // Calculate domain for link scaling
        let maxStr = d3.max([].concat.apply([], this._linkStrength));
        let minStr = d3.min([].concat.apply([], this._linkStrength));
        this._linkScale = d3.scaleLinear()
            .domain([minStr, maxStr])
            .range([1, 15]);

        // Calculate domain width
        let text = this._root.append('text')
            .attr("class", "remove")
            .text('')
            .attr("font-size", "16px");
        let textLengthArr = [];
        data.domains.forEach((domain) => {
            domain.entities.forEach((entity) => {
                text.text(entity.label);
                let bbox = text.node().getBBox();
                textLengthArr.push(bbox.width);
            });
        });
        this._domainWidth = d3.max(textLengthArr) + 15 + this._indicatorWidth;
        this._root.selectAll(".remove").remove();

        let maxEntityFrequency = d3.max(this._data.entities, e => e.frequency);
        this._indicatorUnit = this._indicatorWidth / maxEntityFrequency;

        // Apply dynamic data transformations.
        this._sortEntities(data.domains, this._sortMode);
        this._layoutBundles(data.relations, this._minBundleSources,
            this._minBundleTargets, this._minBundleSize);
        this._hideLinks(data.relations, this._edgeMode);
        this._updateSelection();

        // Draw the actual visualization.
        let space = this._space;
        this._drawRelations(space, data.relations);
        this._drawDomains(space, data.domains);
    }

    /**
     * Deselects all selected entities and bundles.
     */
    clearSelection() {
        //this._data.bundles.forEach(b => b.selected = false);
        this._data.entities.forEach(b => b.selected = false);
        this._updateSelection();
    }

    _selectLinksByEntityId(id) {
        return this._root.selectAll(`.link[data-source="${id}"], .link[data-target="${id}"]`);
    }

    _selectLinksByBundleId(id) {
        return this._root.selectAll(`.link[data-bundle="${id}"]`);
    }

    _handleEntityMouseOver(self) {
        return function () {
            let node = d3.select(this.parentNode);
            node.classed("highlighted", true);
            let id = node.attr("data-id");
            self._selectLinksByEntityId(id)
                .classed("highlighted", true);
        };
    }

    _handleEntityMouseOut(self) {
        return function () {
            let node = d3.select(this.parentNode);
            node.classed("highlighted", false);
            let id = node.attr("data-id");
            self._selectLinksByEntityId(id)
                .classed("highlighted", false);
        };
    }

    _handleBundleMouseOver(self) {
        return function () {
            let node = d3.select(this.parentNode);
            node.classed("highlighted", true);
            let id = node.attr("data-id");
            self._selectLinksByBundleId(id)
                .classed("highlighted", true);
        };
    }

    _handleBundleMouseOut(self) {
        return function () {
            let node = d3.select(this.parentNode);
            node.classed("highlighted", false);
            let id = node.attr("data-id");
            self._selectLinksByBundleId(id)
                .classed("highlighted", false);
        };
    }

    _handleEntityClick(self) {
        return function () {
            let node = d3.select(this.parentNode);
            let id = node.attr("data-id");
            let entity = self._data.entities.filter(e => e.id == id)[0];
            entity.selected = !entity.selected;
            self._updateSelection();
        };
    }

    _handleBundleClick(self) {
        return function () {
            let node = d3.select(this.parentNode);
            let id = node.attr("data-id");
            let bundle = self._data.bundles.filter(b => b.id == id)[0];
            bundle.selected = !bundle.selected;
            self._updateSelection();
        };
    }

    _sortEntities(domains, mode) {
        let labelSort = (a, b) => 0; //a.label.localeCompare(b.label);

        let frequencySort = (a, b) => {
            let sort = b.frequency - a.frequency;
            // Fallback to alphabetic sort for entities with equal frequency.
            return sort != 0 ? sort : labelSort(a, b);
        };

        // For priority sort we apply the greedy algorithm from the paper.
        // This algorithm computes a 'rank' attribute for every entity.
        this._data.entities.forEach(e => e.rank = undefined);
        /*this._data.bundles
         .filter(b => b.visible)
         .sort((a, b) => {
         let s = b.size - a.size;
         if (s !== 0) return s;
         let aFreq = d3.sum(a.sources.concat(a.targets), e => e.frequency);
         let bFreq = d3.sum(b.sources.concat(b.targets), e => e.frequency);
         s = bFreq - aFreq;
         if (s !== 0) return s;
         return labelSort(a.sources[0], b.sources[0]);
         })
         .map((b, i) => {
         b.rank = i;
         return b;
         })
         .forEach(bundle => {
         bundle.sources.concat(bundle.targets).forEach(entity => {
         if (entity.rank == undefined) {
         let bundles = entity.bundles.filter(b => b.visible);
         let totalRank = d3.sum(bundles, b => b.rank);
         entity.rank = totalRank / bundles.length;
         }
         });
         });*/

        // Ensure all entities have a defined rank.
        this._data.entities.forEach(e => {
            if (e.rank === undefined) e.rank = 0;
        });

        let prioritySort = (a, b) => {
            let s = b.rank - a.rank;
            if (s != 0) return s;
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

        domains.forEach(domain => {
            domain.entities.sort(sort).forEach((entity, i) => {
                entity.position = i;
            });
        });
    }

    _layoutBundles(relations, minSources, minTargets, minSize) {
        relations.forEach(relation => {
            relation.bundles.forEach(bundle => {
                // Bundle position is average of connected entity positions.
                let entities = bundle.sources.concat(bundle.targets);
                bundle.position = d3.mean(entities, e => e.position);

                // Filter bundles.
                let hasMinSources = bundle.sources.length >= minSources;
                let hasMinTargets = bundle.targets.length >= minTargets;
                let hasMinSize = entities.length >= minSize;
                let bundlesEnabled = this._edgeMode == 'bundles' || this._edgeMode == 'hybrid';
                bundle.visible = bundlesEnabled && hasMinSources && hasMinTargets && hasMinSize;
            });

            let visibleBundles = relation.bundles
                .filter(b => b.visible)
                .sort((a, b) => a.position - b.position);

            let oldCenter = d3.mean(visibleBundles, b => b.position);

            // Move bundles downwards if they overlap with the one before them.
            let spacing = this._bundleHeight / this._entityHeight;
            for (let i = 1; i < visibleBundles.length; i++) {
                let prev = visibleBundles[i - 1];
                let curr = visibleBundles[i];
                curr.position = Math.max(prev.position + spacing, curr.position);
            }

            // Move all bundles so that the center of gravity is the same as before.
            let newCenter = d3.mean(visibleBundles, b => b.position);
            let correction = oldCenter - newCenter;
            visibleBundles.forEach(b => b.position += correction);
        });
    }

    _hideLinks(relations, edgeMode) {
        relations.forEach(relation => {
            let visibleBundles = relation.bundles.filter(b => b.visible);
            relation.links.forEach(link => {
                link.visible = edgeMode == 'edges' || edgeMode == 'hybrid';

                // In hybrid mode we hide all links that are expressed by a bundle.
                if (edgeMode == 'hybrid') {
                    visibleBundles.forEach(bundle => {
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

    _updateSelection() {
        let data = this._data;
        let applyFocus = (element, array) => array
            .filter((x, i, self) => self.indexOf(x) === i)
            .filter(x => x.selected)
            .filter(x => x !== element)
            .forEach(x => element.focus++);
        3 +

        data.entities.forEach(entity => {
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

        let linkFocus = (a, b) => Math.min(a.focus, b.focus);
        data.relations.forEach(relation => {
            relation.links.forEach(link => {
                link.focus = linkFocus(link.source, link.target);
            });
            relation.sourceLinks.forEach(link => {
                link.focus = linkFocus(link.entity, link.bundle);
            });
            relation.targetLinks.forEach(link => {
                link.focus = linkFocus(link.entity, link.bundle);
            });
        });

        d3.selectAll(".entity")
            .classed("selected", d => d.selected)
            .attr("data-focus", d => d.focus);

        d3.selectAll(".bundle")
            .classed("selected", d => d.selected)
            .attr("data-focus", d => d.focus);

        d3.selectAll(".link")
            .attr("data-focus", d => d.focus);
    }

    _relationScaleX() {
        let halfRelationWidth = this._relationWidth / 2;
        return d3.scaleLinear()
            .domain([-1, 1])
            .range([-halfRelationWidth, halfRelationWidth]);
    }

    _relationScaleY() {
        return d3.scaleLinear()
            .domain([0, 1])
            .range([0, this._entityHeight]);
    }

    _drawSpace(root, offset, zoomRange) {
        // Build hierarchy.
        let zoomContainer = root.append("g")
            .classed("zoom-container", true);
        let offsetContainer = zoomContainer.append("g")
            .classed("offset-container", true);

        // Static transforms.
        offsetContainer.attr("transform", Biset.transform(offset, offset, 1));

        // Detect zoom/pan gestures.
        root.call(d3.zoom()
            .scaleExtent(zoomRange)
            .on("zoom", () => {
                // Zoom transforms.
                zoomContainer.attr("transform", Biset.transform(
                    d3.event.transform.x,
                    d3.event.transform.y,
                    d3.event.transform.k)
                );
            })
        );

        return offsetContainer;
    }

    _drawDomains(root, domains) {
        let self = this;
        let selection = root
            .selectAll(".domain")
            .data(domains);

        // Container
        selection.enter()
            .append("g")
            .classed("domain", true)
            .attr("transform", (d, i) => {
                let x = i * (this._domainWidth + this._relationWidth);
                return Biset.translate(x, 0);
            })
            .each(function (domain) {
                self._drawEntities(d3.select(this), domain.entities);
            });
    }

    _drawEntities(root, entities) {
        let selection = root
            .selectAll(".entity")
            .data(entities);

        /**/


        // Container
        let contents = selection.enter()
            .filter((elem) => {
                let a = 0;
                return (elem.domain.label == "title") ? true : false
            })
            .append("g")
            .classed("entity", true)
            .classed("selected", d => d.selected)
            .attr("data-id", d => d.id)
            .attr("data-focus", d => d.focus)
            .attr("transform", (d, i) => Biset.translate(0, i * this._entityHeight));

        selection.enter()
            .filter((elem) => {
                let a = 0;
                return (elem.domain.label != "title") ? true : false
            })
            .append("g")
            .classed("entity", true)
            .classed("selected", d => d.selected)
            .attr("data-id", d => d.id)
            .attr("data-focus", d => d.focus)
            .attr("transform", (d, i) => Biset.translate(0, i * this._entityHeight));

        contents = root.selectAll(".entity");

        /*.filter((elem) => {
         let a = 0;
         return (elem.domain.label == "query") ? true : false
         })
         .append("a")
         .attr("xlink:href", (d) => "https://users.cg.tuwien.ac.at/waldner/queryExperiment/test.php")
         .style("cursor", "pointer")*/

        // Background
        contents.append("rect")
            .classed("background", true)
            .attr("width", this._domainWidth)
            .attr("height", this._entityHeight - this._entitySpacing)
            .attr("rx", this._cornerRadius)
            .attr("ry", this._cornerRadius)
            .on("mouseover", this._handleEntityMouseOver(this))
            .on("mouseout", this._handleEntityMouseOut(this))
            .on("mousedown", this._handleEntityClick(this));

        // Frequency indicator
        let indicators = contents.append("rect")
            .classed("indicator", true)
            .attr("width", d => this._indicatorUnit * d.frequency)
            .attr("height", this._entityHeight - this._entitySpacing)
            .attr("rx", this._cornerRadius)
            .attr("ry", this._cornerRadius);

        // Frequency indicator tooltip
        contents.append("title")
            .text(d => `${d.frequency} occurrence${d.frequency != 1 ? "s" : ""}`);

        // Label
        contents
            .append("text")
            .classed("text", true)
            .attr("x", 8 + this._indicatorWidth)
            .attr("y", this._entityHeight / 2 + 5)
            .attr("font-size", "16px")
            .attr("fill", "rgba(0, 0, 0, 0.87")
            .text(d => d.label);
    }

    _drawRelations(root, relations) {
        let self = this;
        let selection = root
            .selectAll(".relation")
            .data(relations);

        selection.enter()
            .append("g")
            .classed("relation", true)
            .attr("transform", (d, i) => {
                let x = (i + 1) * this._domainWidth + (i + 0.5) * this._relationWidth;
                let y = this._entityHeight / 2;
                return Biset.translate(x, y);
            })
            .each(function (relation) {
                let node = d3.select(this);
                self._drawSoloLinks(node, relation.links);
                self._drawSourceLinks(node, relation.sourceLinks);
                self._drawTargetLinks(node, relation.targetLinks);
                self._drawBundles(node, relation.bundles);
            });
    }

    _drawBundles(root, bundles) {
        let scaleX = this._relationScaleX();
        let scaleY = this._relationScaleY();
        let width = bundle => this._indicatorUnit * bundle.size;

        let selection = root
            .selectAll(".bundle")
            .data(bundles.filter(b => b.visible));

        let containers = selection.enter()
            .append("g")
            .classed("bundle", true)
            .classed("selected", d => d.selected)
            .attr("data-id", d => d.id)
            .attr("data-focus", d => d.focus)
            .attr("transform", d => {
                let x = scaleX(0) - width(d) / 2;
                let y = scaleY(d.position) - this._bundleHeight / 2;
                return Biset.translate(x, y);
            });

        containers.append("rect")
            .classed("background", true)
            .attr("width", width)
            .attr("height", this._bundleHeight - this._bundleSpacing)
            .attr("rx", this._cornerRadius)
            .attr("ry", this._cornerRadius)
            .on("mouseover", this._handleBundleMouseOver(this))
            .on("mouseout", this._handleBundleMouseOut(this))
            .on("mousedown", this._handleBundleClick(this));

        containers.append("rect")
            .classed("indicator", true)
            .attr("width", d => d.sources.length / d.size * width(d))
            .attr("height", this._bundleHeight - this._bundleSpacing)
            .attr("rx", this._cornerRadius)
            .attr("ry", this._cornerRadius);

        containers.append("title")
            .text(d => `${d.sources.length}/${d.targets.length}`);
    }

    _drawSoloLinks(root, links) {
        let biset = this;
        let scaleX = this._relationScaleX();
        let scaleY = this._relationScaleY();

        let selection = root
            .selectAll(".solo-link")
            .data(links.filter(l => l.visible));
        selection.enter()
            .append("path")
            .classed("link", true)
            .classed("solo-link", true)
            .style("stroke-width", (d) => {
                let sdom = d.source.domain.label;
                let sname = d.source.label;
                let sindex = (sdom == "title") ? biset._queryIndices.indexOf(sname) : biset._topicIndices.indexOf(sname);
                if (sindex == -1) {
                    console.error("Could not find index of title " + sname);
                }

                let tdom = d.target.domain.label;
                let tname = d.target.label;
                let tindex = (tdom == "title") ? biset._queryIndices.indexOf(tname) : biset._topicIndices.indexOf(tname);
                if (tindex == -1) {
                    console.error("Could not find index of title " + tname);
                }
                return (sdom == "title") ? biset._linkScale(biset._linkStrength[tindex][sindex]) : biset._linkScale(biset._linkStrength[sindex][tindex]);
            })
            .attr("data-id", d => d.id)
            .attr("data-source", d => d.source.id)
            .attr("data-target", d => d.target.id)
            .attr("data-focus", d => d.focus)
            .attr("d", d => Biset.link(
                scaleX(-1),
                scaleY(d.source.position),
                scaleX(1),
                scaleY(d.target.position)
            ));
    }

    _drawSourceLinks(root, links) {
        let scaleX = this._relationScaleX();
        let scaleY = this._relationScaleY();

        let selection = root
            .selectAll(".source-link")
            .data(links.filter(l => l.bundle.visible));
        selection.enter()
            .append("path")
            .classed("link", true)
            .classed("source-link", true)
            .attr("data-id", d => d.id)
            .attr("data-source", d => d.entity.id)
            .attr("data-bundle", d => d.bundle.id)
            .attr("data-focus", d => d.focus)
            .attr("d", d => Biset.link(
                -d.bundle.size * this._indicatorUnit / 2,
                scaleY(d.bundle.position),
                scaleX(-1),
                scaleY(d.entity.position)
            ));

        let sel = root.selectAll(".source-link");
    }

    _drawTargetLinks(root, links) {
        let scaleX = this._relationScaleX();
        let scaleY = this._relationScaleY();

        let selection = root
            .selectAll(".target-link")
            .data(links.filter(l => l.bundle.visible));
        selection.enter()
            .append("path")
            .classed("link", true)
            .classed("target-link", true)
            .attr("data-id", d => d.id)
            .attr("data-target", d => d.entity.id)
            .attr("data-bundle", d => d.bundle.id)
            .attr("data-focus", d => d.focus)
            .attr("d", d => Biset.link(
                d.bundle.size * this._indicatorUnit / 2,
                scaleY(d.bundle.position),
                scaleX(1),
                scaleY(d.entity.position)
            ));
    }

    static transform(x, y, scale) {
        return `translate(${x}, ${y}) scale(${scale})`;
    }

    static translate(x, y) {
        return Biset.transform(x, y, 1);
    }

    static link(x0, y0, x1, y1) {
        let xm = (x0 + x1) / 2;
        return `M ${x0} ${y0} C ${xm} ${y0} ${xm} ${y1} ${x1} ${y1}`;
    }

    static transformCsv(csv) {
        if (csv.length == 0) throw Error('No entries in data.');

        // Extract domains.
        let domainId = 1;
        let domains = d3.keys(csv[0]).map(label => ({
            id: domainId++,
            label: label,
        }));

        // Extract entities.
        let entityId = 1;
        let entities = domains.map(domain => {
            domain.entities = [];
            csv.forEach(row => {
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
            domain.entities = d3.values(domain.entities);
            return domain.entities;
        }).reduce((acc, e) => acc.concat(e), []);

        // Extract relations.
        let relationId = 1;
        let relations = [];
        for (let i = 1; i < domains.length; i++) {
            let source = domains[i - 1];
            let target = domains[i];
            let relation = {
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
        let findFirst = (array, predicate) => {
            for (let i = 0; i < array.length; i++) {
                if (predicate(array[i])) return array[i];
            }
            return null;
        };
        let linkId = 1;
        csv.forEach(row => {
            relations.forEach(relation => {
                let sourceLabel = row[relation.source.label];
                let targetLabel = row[relation.target.label];
                let source = findFirst(relation.source.entities, e => e.label == sourceLabel);
                let target = findFirst(relation.target.entities, e => e.label == targetLabel);
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
            bundles: undefined,
        };
    }
}
