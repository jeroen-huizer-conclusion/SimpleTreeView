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
    "use strict";

    // Declare widget"s prototype.
    return declare("SimpleTreeView.widget.SimpleTreeView", [_WidgetBase], {

        //Widget variables
        inputAttribute: null,       
        entity: '',                 // entityname
        parent: '',                 // association to parent

        //Local variable
        _objects: [],               // Holds all the objects in the treeview
        _lastClicked: null,         // The object that is lastclicked

        //Local static
        listClass: "stv_list",
        itemClass: "stc_item",
        spanClass: "stv_span",
        expandableClass: "stv_expandable",
        clickableClass: "stv_clickable",
        nonclickableClass: "stv_nonclickable",
        expandedClass: "stv_expanded",
        collapsedClass: "stv_collapsed",

        postCreate: function () {
            logger.debug(this.id + ".postCreate"); 

            if(this.entities.length){
                var entityConfig = this.entities[0];

                var xpath = "//"+entityConfig.entity;
                var filter = {attributes: [entityConfig.labelattr], sort:[[entityConfig.sortattr, "asc"]]};
                //TODO JH: Unsorted?

                this._getByXPath(xpath, filter, lang.hitch(this, this._getCallback));
            }
        },

        update: function (obj, callback) {
            // Don't really want to depend on context
            callback && callback();
        },

        uninitialize: function(){
            this._contextObj = null;
        },

        _resetSubscriptions: function () {
            logger.debug(this.id + "._resetSubscriptions");

            this.unsubscribeAll();

            if (this._contextObj) {
                this.subscribe({
                    guid: this._contextObj,
                    callback: lang.hitch(this, function(){logger.debug('OK');})
                });
            }
        }, 

        _findEntityConfig: function(entityName){
            // Find all configurations where entity equals to the given entity
            var cnfs = arrayUtil.filter(this.entities, function(entityConfig){return entityConfig.entity == entityName;});
            return cnfs.length ? cnfs[0] : undefined;
        },

        _findChildrenConfigs: function(entityName){
            // Find all configurations where parent refers to the given entity
            return arrayUtil.filter(this.entities, function(entityConfig){return entityConfig.parent.split("/")[1] == entityName;});
        },

        _getByXPath: function(xpath, filter, callback){
            mx.data.get({xpath: xpath, callback: callback, filter: filter});
        },

        _getCallback: function(){
            //Using hitch, a parent node is passed if available.
            var node = arguments.length == 3 ? arguments[0] : this.domNode;
            var objs = arguments.length == 3 ? arguments[1] : arguments[0];

            if(objs.length){

                var entity = objs[0].getEntity();
                var entityConfig = this._findEntityConfig(entity);
                var childConfigs = this._findChildrenConfigs(entity);

                var list = domConstruct.create("ul", {class: this.listClass}, node);

                var self = this; // Different 'this' in arrayUtil.forEach, instead maybe bind/hitch to the callback?
                arrayUtil.forEach(objs, function(obj){
                    
                    self._objects[obj.getGuid()] = obj;
                    
                    var item = self._createNode(list, obj, entityConfig, childConfigs);

                    arrayUtil.forEach(childConfigs, function(childConfig){
                        var xpath = "//"+childConfig.entity+"["+childConfig.parent.split("/")[0] + " = " +obj.getGuid() +"]";
                        var filter = {attributes: [childConfig.labelattr], sort:[[childConfig.sortattr, "asc"]]};

                        self._getByXPath(xpath, filter, lang.hitch(self, self._getCallback, item)); // Adds parentnode to callback
                    })
                })
            }

            // Start collapsed, only top nodes visible
            if(arguments.length == 3){
                this._toggleNode(node.attributes.dataid.value);
            }

        },

        _createNode: function(parentNode, obj, entityConfig, childConfigs){
            var item = domConstruct.create("li", {class: this.itemClass +" " + this.expandedClass, 
                                          dataid: obj.getGuid()}, parentNode);

            if(childConfigs.length){
                domClass.add(item, this.expandableClass)
            }

            var span = domConstruct.create("span", {class: this.spanClass, 
                                            dataid: obj.getGuid(),  
                                            innerHTML: obj.get(entityConfig.labelattr)}, item);

            this._addOnclick(entityConfig, item, span);
            return item
        },

        _addOnclick: function(config, item, span){
            // Add onClick handlers
            this.connect(item, "click", lang.hitch(this, this._toggleHandler));

            if (config.onclickform) {
                domClass.add(span, this.clickableClass);
                this.connect(span, "click", lang.hitch(this, this._onClickForm, config));
            } else {
                domClass.add(span, this.nonclickableClass);
            }
        },

        _toggleHandler: function(evt){
            var dataid = evt.target.attributes.dataid.value;
            this._toggleNode(dataid);
            evt.stopPropagation();
        },

        _toggleNode: function(dataid){
            domQuery("li[dataid='"+ dataid + "']").toggleClass(this.expandedClass).toggleClass(this.collapsedClass);
            domQuery("li[dataid='"+ dataid + "'] > ul").toggleClass("hidden");
        },

        _onClickForm: function(config, evt){
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
                        callback: lang.hitch(this, function(){this._lastClicked = object;}),
                        error: function(){console.log(error);}
                });
            }
            evt.stopPropagation();
        }
    })
});

require(["SimpleTreeView/widget/SimpleTreeView"]);