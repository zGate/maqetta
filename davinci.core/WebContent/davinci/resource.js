dojo.provide("davinci.resource");
dojo.provide("davinci.resource.FileTypeFilter");
dojo.provide("davinci.resource.alphabeticalSortFilter");
dojo.provide("davinci.resource.foldersFilter");
dojo.require("davinci.model.Resource");
dojo.require("davinci.model.Path");


dojo.mixin(davinci.resource, {
	root:null,
	
	__CASE_SENSITIVE:false,
	
	
	resourceChanged: function(type,changedResource){
		
		if(changedResource == davinci.resource.getRoot()){
			changedResource.reload();
			davinci.resource.getRoot().getChildren(dojo.hitch(davinci.resource,function(children){
				davinci.resource.onChildrenChange(davinci.resource.getRoot(),children);
			}));
			return davinci.resource.getRoot();
		}else if (type == 'created' || type == 'deleted' || type == 'renamed' || type == 'updated' || type=='reload'){
			var parent, resourcePath;
			
			if(changedResource.parent){
				/* already created model object */
				parent = changedResource.parent;
				resourcePath = changedResource.getPath();
			}else{
				/* find the resource parent */
				var p1 = (new davinci.model.Path(changedResource)).removeLastSegments();
				var project = changedResource.getProject();
				parent = davinci.resource.findResource(project, p1.toString() ) || davinci.resource.getRoot();
				resourcePath = changedResource;
			}
			if(parent.elementType=="Folder" && type=='reload'){
				/* 'reload' forces a full parent reload.  most model actions handle the server
				 * command and the modeling commands, so forcing a client & server resource sync isn't usually neccisary.
			     */
				parent.reload();
			}
			
			/* force the resource parent to update its children */
			parent.getChildren(function(children){davinci.resource.onChildrenChange(parent,children);}, true);	
		}
	},
	
	
	/* Resource tree model methods */
	newItem: function(/* Object? */ args, /*Item?*/ parent){
	},
	
	pasteItem: function(/*Item*/ childItem, /*Item*/ oldParentItem, /*Item*/ newParentItem, /*Boolean*/ bCopy){
	},
	
	
	onChange: function(/*dojo.data.Item*/ item){
	},
	
	onChildrenChange: function(/*dojo.data.Item*/ parent, /*dojo.data.Item[]*/ newChildrenList){
//		console.log("parent:" + parent + " children :" + newChildrenList);
	},
	
	getLabel: function(/*dojo.data.Item*/ item){
		
		var label=item.getName();
		if (item.link){
			label=label+'  ['+item.link+']';
		}
		return label;
	},

	getIdentity: function(/* item */ item){
		return item.getPath();
	},
	
	destroy: function(){
		davinci.resource.subscriptions.forEach(dojo.unsubscribe);
	},
		
	mayHaveChildren: function(/*dojo.data.Item*/ item){
	    return item.elementType=="Folder";
	},
	getRoot: function(onComplete){
		
		if(!davinci.resource.workspace){
			davinci.resource.workspace = new davinci.model.Resource.Workspace();
		}

		
		if(davinci.Runtime.singleProjectMode()){
			if (!davinci.resource.root){
				davinci.resource.root=new davinci.model.Resource.Project(davinci.Runtime.getProject(), davinci.resource.workspace);
				davinci.resource.workspace.addChild(davinci.resource.root);
			}	
		}else{
			// figure this out when more than one project on a workspace
			
		}
		
		if(onComplete){
			onComplete(davinci.resource.root);
		}else{
			return davinci.resource.root;
		}
	},
	
	getChildren: function(/*dojo.data.Item*/ parentItem, /*function(items)*/ onComplete){
		parentItem.getChildren(onComplete, true); // need to make the call sync, chrome is to fast for async (ALP: what does this mean?)
	},
	
	copy: function(sourceFile, destFile, recurse){
		var path = sourceFile.getPath? sourceFile.getPath() : sourceFile;
		var destPath = destFile.getPath? destFile.getPath() : destFile;
		var response = davinci.Runtime.serverJSONRequest({
			url:"./cmd/copy", 
			handleAs:"text", 
			sync:true,
			content:{source:path, dest: destPath, recurse: String(recurse)}  });
		/* force a reload since we dont really know if this is a file or directory being copied */
		davinci.resource.resourceChanged("reload", destFile);
	},

	download: function(files,archiveName, userLibs){
		
		/* using a servlet to create the file on the fly from the request, 
		   this will eliminate delay from download click to actual start
		*/
		var libString = "";
		if(userLibs)
			libString = "&libs="+escape(dojo.toJson(userLibs));
		
		window.location.href= "./cmd/download?fileName=" + archiveName + "&resources="+escape(dojo.toJson(files))+libString ;
	},
	

	getWorkspace : function(){
		// list all the projects in a users workspace
		return davinci.resource.workspace;
		
		
	},
	
	
	
	
	/**
	 * @param proj Project to search
	 * @param name  Path of resource to find.  May include wildcard.
	 * @param ignoreCase
	 * @param inFolder  String or Resource object in which to start search.
	 * @returns  Resource
	 */
	findResource: function(proj, name, ignoreCase, inFolder, workspaceOnly, project){
		
		ignoreCase=ignoreCase || !davinci.resource.__CASE_SENSITIVE;
		
		var project = proj.name || proj;
		
		var seg1=0,segments;
		var resource=davinci.resource.root;
		if (inFolder) {
		    if (typeof inFolder == 'string') {
		        inFolder = davinci.resource.findResource(project, inFolder, ignoreCase, null, workspaceOnly);
		    }
		    resource = inFolder;
		}
		var foundResources=[];
		if (typeof name=='string') {
			segments=name.split('/');
			if (segments[0]=='.'){
				seg1=1;
			}
		} else if (name.getSegments) {
			segments=name.getSegments();
			name=name.toString();
		}
		var isWildcard;
		for (var i=0;i<segments.length;i++) { //FIXME: use filter()
			if (segments[i].indexOf("*") >= 0) {
				isWildcard=true;
				break;
			}
		}
		
		var serverFind;
		function doFind()
		{
			for (var i=seg1;i<segments.length;i++)
			{
				var found=null;
				if (!resource._isLoaded )
				{
					serverFind=true;
					break;
				}
//					resource.getChildren(function(){}, true);
				found=resource=resource._getChild(segments[i]);
				if (!found) {
				  return;
				}
			}
			return found;			
		}
		
		var found;
		if (!isWildcard){
			found=doFind();
		}
		if (!found && (serverFind || isWildcard))
		{			
			var response = davinci.Runtime.serverJSONRequest({
				  url:"./cmd/findResource", 
			          content:{path: name, ignoreCase: ignoreCase, workspaceOnly: workspaceOnly, inFolder: inFolder!=null?inFolder.getPath():null, project:project}, sync:true  });
			
			if (response && response.length>0)
			{
				for (var i=0;i<response.length;i++)
				{
					var foundFile=response[i];
					var loadResource=davinci.resource.getRoot();

					for (var j=0;j<foundFile.parents.length;j++)
					{
						if (!loadResource._isLoaded)
						{
							loadResource._addFiles(foundFile.parents[j].members);
						}
						if (j+1<foundFile.parents.length)
						{
							var name=foundFile.parents[j+1].name;
							var newResource=loadResource._getChild(name);
							if (!newResource) {
								newResource= new davinci.model.Resource.Folder(name,loadResource);
							}
							loadResource=newResource;
						}
						
					}
					var resource=davinci.resource.getRoot();
					seg1=0;
					segments=foundFile.file.split('/');
					if (segments[0]=='.') {
						seg1=1;
					}

					foundResources[i]=doFind();
				}
			}
		}
		else {
			foundResources[0]=found;
		}
		return isWildcard ? foundResources : foundResources[0];
	}
	
});

dojo.declare("davinci.resource.foldersFilter",null,{
   filterItem: function(item)
   {
       if (item.elementType=='File') {
	    	return true;
       }
   }
});
dojo.declare("davinci.resource.FileTypeFilter",null,{
    constructor: function(types)
    {
	davinci.resource.types=types.split(",");
    },
    filterList: function(list)
    {
		var newList=[];
		for (var i=0;i<list.length;i++)
		{
			var resource=list[i];
			if (resource.elementType!="File"){
				newList.push(resource);
			}
			else
			{
				for (var j=0;j<davinci.resource.types.length;j++)
				{
					if (resource.getExtension()==davinci.resource.types[j] || davinci.resource.types[j]=="*")
					{
						newList.push(resource);
						break;
					}
				}
			}
		}
		return newList;
    }
});

davinci.resource.alphabeticalSort = function(items){ return items.sort(function(a,b){ return a.name < b.name ? -1 : (a.name > b.name ? 1 : 0); }); };

davinci.resource.subscriptions = [dojo.subscribe("/davinci/resource/resourceChanged",davinci.resource, function(){return davinci.resource.resourceChanged;}())];
