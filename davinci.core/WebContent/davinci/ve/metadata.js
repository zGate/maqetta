dojo.provide("davinci.ve.metadata");

dojo.require("dojo.i18n");
dojo.require("davinci.ve.input.SmartInput");


/**
 * @static
 */
davinci.ve.metadata = function() {
    
    var METADATA_CLASS_BASE = "davinci.libraries.";
    
    // Array of library descriptors.
    var libraries = {};
    // Widget metadata cache
    // XXX Should there be a limit on metadata objects in memory?
    var cache = {};
    // Localization strings
    var l10n = null;
    
    var defaultProperties = {
        id: {datatype: "string", hidden: true},
        lang: {datatype: "string", hidden: true},
        dir: {datatype: "string", hidden: true},
        "class": {datatype: "string", hidden: true},
        style: {datatype: "string", hidden: true},
        title: {datatype: "string", hidden: true}
    };
    
    
	
    // XXX not used anywhere
    // var defaultEvents = [
    // "onkeydown",
    // "onkeypress",
    // "onkeyup",
    // "onclick",
    // "ondblclick",
    // "onmousedown",
    // "onmouseout",
    // "onmouseover",
    // "onmouseup"
    // ];
    
    dojo.subscribe("/davinci/ui/libraryChanged", function() {
        // XXX We should be smart about this and only reload data for libraries whose path has
        //  changed.  This code currently nukes everything, reloading all libs, even those that
        //  haven't changed.
        libraries = {};
        cache = {};
        l10n = null;
        davinci.ve.metadata.init();
    });
    
    function parseLibraryDescriptor(data) {
    	var path = new davinci.model.Path(data.metaPath),
    		descriptor = data.descriptor;
     
        descriptor.$path = path.toString();
        libraries[descriptor.name] = descriptor;
        
        descriptor.$providedTypes = {};
        dojo.forEach(descriptor.widgets, function(item) {
            descriptor.$providedTypes[item.type] = item;

            // XXX refactor into function, so we don't change original data?
            if (item.icon) {
                item.icon = path.append(item.icon).toString();
            }
            // XXX refactor into function
            item.widgetClass = descriptor.categories[item.category].widgetClass;
            
            dojo.forEach(item.data, function(data) {
                if (!descriptor.$providedTypes[data.type]) {
                    descriptor.$providedTypes[data.type] = true;
                }
            });
        });
        
        // mix in descriptor instance functions
        dojo.mixin(descriptor, {
            /**
             * Get a translated string for this library
             * @param key
             * @returns {String}
             */
            _maqGetString: getDescriptorString
        });
        
        // register Dojo module for metadata path; necessary for loading of helper
        // and creation tool classes
        dojo.registerModulePath(METADATA_CLASS_BASE + descriptor.name,
                path.relativeTo(dojo.baseUrl).toString());
    }
    
    function getDescriptorForType(type) {
        for (var name in libraries) if (libraries.hasOwnProperty(name)) {
            var lib = libraries[name];
            if (lib.$providedTypes[type]) {
                return lib;
            }
        }
        return null;
    }

    var XXXwarned = false;
    function getDescriptorString(key) {
        // XXX What to do about localization? (see initL10n)
        if (!XXXwarned) {
//            console.warn("WARNING: NOT IMPLEMENTED: localization support for library descriptors");
            XXXwarned = true;
        }
        return null;
        // XXX XXX
        
        if (!key) {
            return null;
        }
        key = key.replace(/\./g, "_");
        value = l10n[key];
        return value;
    }
    
    // XXX What to do about localization (this._loc)?
//    function initL10n() {
//        // Place localized strings for each library in a file at libs/{libName}/nls/{libName}.js
//        dojo["requireLocalization"](this.module + "." + this.base, this.base);
//        try {
//            l10n = dojo.i18n.getLocalization(this.module + "." + this.base, this.base);
//        } catch (ex) {
//            console.error(ex);
//        }
//    };
    
    function getMetadata(type) {
        if (!type) {
            return undefined;
        }
        
        if (cache.hasOwnProperty(type)) {
            return cache[type];
        }
        
        // get path from library descriptor
        var lib = getDescriptorForType(type),
            descriptorPath;
        if (lib) {
            descriptorPath = lib.$path;
        }
        if (!descriptorPath) {
            return undefined;
        }
        
        var metadata,
            metadataUrl = [ descriptorPath, "/", type.replace(/\./g, "/"), "_oam.json" ].join('');
        dojo.xhrGet({
            url : metadataUrl,
            handleAs : "json",
            sync : true, // XXX should be async
            load : function(data) {
                metadata = data;
            }
        });
        if (!metadata) {
            console.error("ERROR: Could not load metadata for type: " + type);
            return null;
        }
        
        metadata.property = dojo.mixin({}, defaultProperties, metadata.property);
        // store location of this metadata file, since some resources are relative to it
        metadata.$src = metadataUrl;
        // XXX localize(metadata);
        cache[type] = metadata;
        
        return metadata;
    }
    
//     function localize(metadata) {
//        if (!l10n) {
//            return;
//        }
//        
//        var loc = l10n;
//        if (metadata.name) {
//            var label = loc[metadata.name];
//            if (label) {
//                metadata.label = label;
//            }
//        }
//        var properties = metadata.properties;
//        if (properties) {
//            for ( var name in properties) {
//                var label = loc[name];
//                if (label) {
//                    properties[name].label = label;
//                }
//                var description = loc[name + "_description"];
//                if (description) {
//                    properties[name].description = description;
//                }
//            }
//        }
//        var events = metadata.events;
//        if (events) {
//            for ( var name in events) {
//                var label = loc[name];
//                if (label) {
//                    events[name].label = label;
//                }
//            }
//        }
//        var panes = metadata.propertyPanes;
//        if (panes) {
//            for ( var name in panes) {
//                var label = loc[name];
//                if (label) {
//                    panes[name].label = label;
//                }
//            }
//        }
//    };
    
    function queryProps(obj, queryString) {
        if (!queryString) { // if undefined, null or empty string
            return obj;
        }
        dojo.every(queryString.split("."), function(name) {
            if (!obj[name]) {
                obj = undefined;
                return false;
            }
            obj = obj[name];
            return true;
        });
        return obj;
    }
    
    function getAllowedElement(name, type) {
    	var propName = 'allowed' + name,
    		prop = davinci.ve.metadata.queryDescriptor(type, propName);
    	if (! prop) {
    		// set default -- 'ANY' for 'allowedParent' and 'NONE' for
    		// 'allowedChild'
    		prop = name === 'Parent' ? 'ANY' : 'NONE';
    	}
    	return prop.split(/\s*,\s*/);
    }

    
    return /** @scope davinci.ve.metadata */ {
        /**
         * Read the library metadata for all the libraries linked in the user's workspace
         */
		init : function() {
			dojo.forEach(davinci.library.getInstalledLibs(), function(lib) {
				var data = davinci.library.getLibMetadata(lib.id, lib.version);
				if (data) {
					parseLibraryDescriptor(data);
				}
			});
		},
        
        /**
         * Get library metadata.
         * @param {String} [name]
         * 			Library identifier.
         * @returns library metadata if 'name' is defined; otherwise, returns
         * 			array of all libraries' metadata.
         */
        getLibrary: function(name) {
        	return name ? libraries[name] : libraries;
        },
        
        
    	loadThemeMeta: function(model){
    		// try to find the theme using path magic
    		var style = model.find({'elementType':'HTMLElement', 'tag':'style'});
    		var imports = [];
    		var claroThemeName="claro";
    		var claroThemeUrl;
    		for(var z=0;z<style.length;z++){
    			for(var i=0;i<style[z].children.length;i++){
    				if(style[z].children[i]['elementType']== 'CSSImport')
    					imports.push(style[z].children[i]);
    			}
    		}
    		
    		var themePath = new davinci.model.Path(model.fileName);
    		/* remove the .theme file, and find themes in the given base location */
    		var allThemes = davinci.library.getThemes(themePath.removeLastSegments(1).toString());
    		var themeHash = {};
    		for(var i=0;i<allThemes.length;i++){
    			for(var k=0;k<allThemes[i]['files'].length;k++){
    				themeHash[allThemes[i]['files']] = allThemes[i];
    			}
    		}
    		
    		
    		/* check the header file for a themes CSS.  
    		 * 
    		 * TODO: This is a first level check, a good second level check
    		 * would be to grep the body classes for the themes className. this would be a bit safer.
    		 */
    		
    		for(var i=0;i<imports.length;i++){
    			var url = imports[i].url;
    			/* trim off any relative prefix */
    			for(var themeUrl in themeHash){
    				if(themeUrl.indexOf(claroThemeName) > -1){
    					claroThemeUrl = themeUrl;
    				}
    				if(url.indexOf(themeUrl)  > -1){
    					var returnObject = {};
    					returnObject['themeUrl'] = url;
    					returnObject['themeMetaCache'] = davinci.library.getMetaData(themeHash[themeUrl]);
    					returnObject['theme'] =  themeHash[themeUrl];
    					return returnObject;	
    				}
    			}
    		}
    		// If we are here, we didn't find a cross-reference match between 
    		// CSS files listed among the @import commands and the themes in
    		// themes/ folder of the user's workspace. So, see if there is an @import
    		// that looks like a theme reference and see if claro/ is in
    		// the list of themes, if so, use claro instead of old theme
    		if(claroThemeUrl){
    			var newThemeName = claroThemeName;
    			var oldThemeName;
    			for(var i=0;i<imports.length;i++){
    				var cssfilenamematch=imports[i].url.match(/\/([^\/]*)\.css$/);
    				if(cssfilenamematch && cssfilenamematch.length==2){
    					var cssfilename = cssfilenamematch[1];
    					var themematch = imports[i].url.match(new RegExp("themes/"+cssfilename+"/"+cssfilename+".css$"));
    					if(themematch){
    						oldThemeName = cssfilename;
    						break;
    					}
    				}
    			}
    			if(oldThemeName){
    				// Update model
    				var htmlElement=model.getDocumentElement();
    				var head=htmlElement.getChildElement("head");
    				var bodyElement=htmlElement.getChildElement("body");
    				var classAttr=bodyElement.getAttribute("class");
    				if (classAttr){
    					bodyElement.setAttribute("class",classAttr.replace(new RegExp("\\b"+oldThemeName+"\\b","g"),newThemeName));
    				}
    				var styleTags=head.getChildElements("style");
    				dojo.forEach(styleTags, function (styleTag){
    					dojo.forEach(styleTag.children,function(styleRule){
    						if (styleRule.elementType=="CSSImport"){
    							styleRule.url = styleRule.url.replace(new RegExp("/"+oldThemeName,"g"),"/"+newThemeName);
    						}
    					}); 
    				});
    				// Update data in returnObject
    				var url = imports[i].url.replace(new RegExp("/"+oldThemeName,"g"),"/"+newThemeName);
    				var returnObject = {};
    				returnObject['themeUrl'] = url;
    				// Pull claro theme data
    				returnObject['themeMetaCache'] = davinci.library.getMetaData(themeHash[claroThemeUrl]);
    				returnObject['theme'] =  themeHash[claroThemeUrl];
    				returnObject['themeMetaCache']['usingSubstituteTheme'] = {
    						oldThemeName:oldThemeName,
    						newThemeName:newThemeName
    				};
    				// Make sure source pane updates text from model

    				
    				return returnObject;	
    			}
    		}
    	},
        
        getLibraryBase : function(type) {
            if (type) {
                var lib = getDescriptorForType(type);
                if (lib) {
                    return lib.$path;
                }
            }
            return undefined;
        },
        
        /**
         * @param {String|Object} widget
         *            Can be either a string of the widget type (i.e. "dijit.form.Button") or
         *            a davinci.ve._Widget instance.
         * @param queryString
         * @return 'undefined' if there is any error; otherwise, the requested data.
         */
        query : function(widget, queryString) {
            if (!widget) {
                return undefined;
            }
            
            var type,
                metadata;
            if (widget.declaredClass) { // if instance of davinci.ve._Widget
                if (widget.metadata) {
                    metadata = widget.metadata;
                }
                type = widget.type;
            } else {
                type = widget;
            }
            
            if (!metadata) {
                metadata = getMetadata(type);
                if (!metadata) {
                    return undefined;
                }
                if (widget.declaredClass) {
                    widget.metadata = metadata;
                }
            }
            
            return queryProps(metadata, queryString);
        },
        
        /**
         * @param {String} type
         *            Widget type (i.e. "dijit.form.Button")
         * @param queryString
         * @return 'undefined' if there is any error; otherwise, the requested data.
         */
        queryDescriptor : function(type, queryString) {
            var lib = getDescriptorForType(type),
                item;
            if (lib) {
                item = lib.$providedTypes[type];
            }
            if (!item || typeof item !== "object") {
                return undefined;
            }
            
            var value = queryProps(item, queryString);
            
            // post-process some values
            switch (queryString) {
                case "resizable":
                    // default to "both" if not defined
                    if (!value) {
                        value = "both";
                    }
                    break;
                case "inlineEdit":
                    // instantiate inline edit object
                    if (value) {
                        if (typeof value == "string") {
                            dojo['require'](value);
                            var aClass = dojo.getObject(value);
                            if (aClass) {
                                value = new aClass();
                            }
                        } else {
                            var si = new davinci.ve.input.SmartInput();
                            dojo.mixin(si, value);
                            value = si;
                        }
                    }
                    break;
            }
            return value;
        },
        
        /**
         * Return value of 'allowedParent' property from widget's descriptor.
         * If widget does not define that property, then it defaults to ['ANY'].
         * 
         * @param {String} type
         * 			Widget type (i.e. "dijit.form.Button")
         * @returns Array of allowed widget types or ['ANY']
         * @type {[String]}
         */
        getAllowedParent: function(type) {
        	return getAllowedElement('Parent', type);
        },
        
        /**
         * Return value of 'allowedChild' property from widget's descriptor.
         * If widget does not define that property, then it defaults to ['NONE'].
         * 
         * @param {String} type
         * 			Widget type (i.e. "dijit.form.Button")
         * @returns Array of allowed widget types, ['ANY'] or ['NONE']
         * @type {[String]}
         */
        getAllowedChild: function(type) {
        	return getAllowedElement('Child', type);
        }
    };
}();
