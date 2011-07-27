package org.davinci.server;

import java.util.Vector;

public class VProject extends VDirectory {

	 public VProject(IVResource parent, String name) {
		 super(parent,name);
	 }

	
    public String getPath(){
        return ".";

    }
}
