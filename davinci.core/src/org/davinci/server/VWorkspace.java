package org.davinci.server;

import java.util.Vector;

public class VWorkspace extends VDirectory{

	public VWorkspace(){
		this.name = "";
	}
	
    public IVResource[] find(String project, String path) {
    
    	/* workspace doesn't support wild card in project names yet */
    	IVResource p = (IVResource)this.get(project);
        return p.find(path);
   }
}
