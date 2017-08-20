/* global define, require, logger, mx, mendix, */ 
"use strict";

define([
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",

    "mxui/dom",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/query",
    "dojo/NodeList-dom"
    ], 
    function (declare, _WidgetBase, dom, lang, arrayUtil, domClass, domConstruct, domQuery) {

    // Declare widget"s prototype.
    return declare("SimpleTreeView.widget.SimpleTreeView", [_WidgetBase], {

        //Widget variables
        inputAttribute: null,       
        entities: [{
            entity: "",
            parent: "",
            labelattr: "",
            sortattr: "",
            constraint: "",
            onclickform: "",
            startexpanded: false,
            lazyload: false
        }],
        filters: [{
            filterentity: "",
            filter: "",
            filterlabel: "",
            filteractive: false
        }],
        applybtnlabel: "",

        //Local variable
        _objects: [],               // Holds all the objects in the treeview
        _lastClicked: null,         // The object that is lastclicked

        //Local static
        listClass: "stv_list",
        itemClass: "stv_item",
        spanClass: "stv_span",
        expandableClass: "stv_expandable",
        clickableClass: "stv_clickable",
        nonclickableClass: "stv_nonclickable",
        expandedClass: "stv_expanded",
        collapsedClass: "stv_collapsed",

        postCreate: function () {
            logger.debug(this.id + ".postCreate"); 

            if(this.entities.length){
                arrayUtil.forEach(this._findParentConfigs(), this._getParentObjects, this);
            }

            this._drawFilters();
        },

        _recreate: function(){
            this.objects = [];

            domQuery("ul", this.domNode).orphan();
            if(this.entities.length){
                arrayUtil.forEach(this._findParentConfigs(), this._getParentObjects, this);
            }
        },

        _getParentObjects: function(config){
            var xpath = "//"+config.entity;
            xpath += config.constraint; // Not handling any tokens (e.g. currentdatetime).

            arrayUtil.forEach(this._findActiveFilters(config), function(filter){
                xpath += filter.filter; // Not handling any tokens (e.g. currentdatetime).
            });

            var filter = {attributes: [config.labelattr], sort:[[config.sortattr, "asc"]]};
            this._getByXPath(xpath, filter, lang.hitch(this, this._getCallback));
        },

        _getChildObjects: function(obj, childConfigs, node){
            if(node.attributes.loaded)
                return;

            arrayUtil.forEach(childConfigs, function(childConfig){
                var xpath = "//"+childConfig.entity+"["+childConfig.parent.split("/")[0] + " = " +obj.getGuid() +"]";
                xpath += childConfig.constraint; // Not handling any tokens (e.g. currentdatetime).

                arrayUtil.forEach(this._findActiveFilters(childConfig), function(filter){
                    xpath += filter.filter; // Not handling any tokens (e.g. currentdatetime).
                });

                var filter = {attributes: [childConfig.labelattr], sort:[[childConfig.sortattr, "asc"]]};
                this._getByXPath(xpath, filter, lang.hitch(this, this._getCallback, node)); // Adds parentnode to callback
            }, this);
        },

        _findEntityConfig: function(entityName){
            // Find all configurations where entity equals to the given entity
            var cnfs = arrayUtil.filter(this.entities, function(entityConfig){return entityConfig.entity == entityName;});
            return cnfs.length ? cnfs[0] : undefined;
        },

        _findParentConfigs: function(){
            // Find all configurations where parent is empty
            return arrayUtil.filter(this.entities, function(entityConfig){return !entityConfig.parent || entityConfig.parent.trim() === '';});
        },

        _findChildrenConfigs: function(config){
            // Find all configurations where parent refers to the given entity
            return arrayUtil.filter(this.entities, function(entityConfig){return entityConfig.parent.split("/")[1] == config.entity;});
        },

        _findActiveFilters: function(config){
            // Find all filters for the related entity that are active
            return arrayUtil.filter(this.filters, function(filter){return filter.filteractive && filter.filterentity == config.entity;});  
        },

        _getByXPath: function(xpath, filter, callback){
            mx.data.get({xpath: xpath, callback: callback, filter: filter});
        },

        _getCallback: function(){
            //Parent node might be passed if available.
            var isChild = arguments.length == 3;
            var node = isChild ? arguments[0] : this.domNode;
            var objs = isChild ? arguments[1] : arguments[0];

            if(objs.length){
                var entityConfig = this._findEntityConfig(objs[0].getEntity());
                var childConfigs = this._findChildrenConfigs(entityConfig);

                var list = domConstruct.create("ul", {class: this.listClass}, node);
                if(isChild && !node.lazyload && !domClass.contains(node, this.expandedClass)){
                    domClass.add(list, "hidden");
                }

                arrayUtil.forEach(objs, function storeObject(obj){
                    this._objects[obj.getGuid()] = obj;
                }, this);

                arrayUtil.forEach(objs, function addNode(obj){
                    var item = this._createNode(list, obj, entityConfig, childConfigs);
                   
                    if(!entityConfig.lazyload){
                        this._getChildObjects(obj, childConfigs, item);
                    }

                },this);
            }
            else if(isChild){
                domClass.remove(node, this.expandableClass);
            }

            node.attributes.loaded = true; // Prevents lazyloading more than once
        },

        _createNode: function(parentNode, obj, entityConfig, childConfigs){
            var item = domConstruct.create("li", {class: this.itemClass, 
                                                    dataid: obj.getGuid(),
                                                    lazyload: entityConfig.lazyload
                                            }, parentNode);

            if(childConfigs.length){
                domClass.add(item, this.expandableClass);
                if(entityConfig.startexpanded && !entityConfig.lazyload){
                    domClass.add(item, this.expandedClass);
                }
                else{
                    domClass.add(item, this.collapsedClass);
                }
            }

            var span = domConstruct.create("span", {class: this.spanClass, 
                                            dataid: obj.getGuid(),  
                                            innerHTML: obj.get(entityConfig.labelattr)
                                        }, item);

            this._addNodeOnClick(obj, entityConfig, item, span);
            return item;
        },

        _addNodeOnClick: function(obj, config, item, span){
            var childConfigs = this._findChildrenConfigs(config);
            if(childConfigs.length){
                this.connect(item, "click", lang.hitch(this, this._toggleChildNodes));            
                if(config.lazyload){
                    this.connect(item, "click", lang.hitch(this, this._getChildObjects, obj, childConfigs, item));
                }
            }

            if (config.onclickform) {
                domClass.add(span, this.clickableClass);
                this.connect(span, "click", lang.hitch(this, this._openFormForConfig, config));
            } else {
                domClass.add(span, this.nonclickableClass);
            }
        },

        _toggleChildNodes: function(evt){
            var node = evt.target;
            var dataid = node.attributes.dataid.value; // This causes some issues when the same data is displayed in two treeviews on the same page..
            domQuery("li[dataid='"+ dataid + "']").toggleClass(this.expandedClass).toggleClass(this.collapsedClass);
            domQuery("li[dataid='"+ dataid + "'] > ul").toggleClass("hidden");

            evt.stopPropagation();
        },

        _openFormForConfig: function(config, evt){
            var dataid = evt.target.attributes.dataid.value;
            var object = this._objects[dataid];
            if(object != this._lastClicked){
                // What if this object is already in our session somewhere?
                var context= new mendix.lib.MxContext();
                context.setContext(object.getEntity(), object.getGuid());

                // Handle any errors? What to do on callback?
                mx.ui.openForm(config.onclickform, {
                        location: "content",
                        context: context,
                        callback: lang.hitch(this, function(){this._lastClicked = object;})
                });
            }
            evt.stopPropagation();
        },


        /*
        * Filters..
        */

        _drawFilters: function(){

            if(this.filters.length){

                var btnGroup = domConstruct.create("div", {class: "btn-group pull-right"}, this.domNode);
                var btn = domConstruct.create("a", {class: 'dropdown-toggle', "data-toggle": "dropdown"}, btnGroup);
                domConstruct.create("span", {class:"glyphicon glyphicon-filter"}, btn);

                this.connect(btn, "click", lang.hitch(this, this._toggleDropdownMenu, btnGroup));

                var dd = domConstruct.create("div", {class:"dropdown-menu"} ,btnGroup); 
                var form = domConstruct.create("form", {class:"form container-fluid"}, dd);

                arrayUtil.forEach(this.filters, function drawFilter(filter){this._drawFilter(filter, form);}, this);

                var btnDiv = domConstruct.create("div", {class:"form-group"}, form);
                var applyBtn = domConstruct.create("button", {type:"button", class:"btn btn-primary btn-block", innerHTML: this.applybtnlabel}, btnDiv);

                this.connect(applyBtn, "click", lang.hitch(this, this._recreate));
                this.connect(applyBtn, "click", lang.hitch(this, this._toggleDropdownMenu, btnGroup));
            }
        },

        _toggleDropdownMenu: function(menuNode){
            if(domClass.contains(menuNode, 'open'))
                domClass.remove(menuNode, 'open');
            else
                domClass.add(menuNode, 'open');
        },

        _drawFilter: function(filter, formNode){
            var id = Math.ceil(Math.random()*1000000+1);
            var cbDiv = domConstruct.create("div", {class:"checkbox"}, formNode);
            var label = domConstruct.create("label", {for: id, class: ""}, cbDiv);
            var cb = domConstruct.create("input", {id: id ,type:"checkbox", checked: filter.filteractive}, label);
            domConstruct.create("span", {innerHTML:filter.filterlabel}, label);

            this.connect(cb, "click", lang.hitch(this, this._toggleFilter, filter));
        },

        _toggleFilter: function(filter, evt){
            filter.filteractive = !filter.filteractive;
            evt.stopPropagation();
        },

    });
});

require(["SimpleTreeView/widget/SimpleTreeView"]);