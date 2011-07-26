package org.davinci.server.internal.command;

import java.io.IOException;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.davinci.server.Command;
import org.davinci.server.IVResource;
import org.davinci.server.user.User;

public class RemoveWorkingCopy extends Command {

    public void handleCommand(HttpServletRequest req, HttpServletResponse resp, User user) throws IOException {
        String path = req.getParameter("path");
        String project = req.getParameter("project");
        if(project==null){
        	System.err.println("Error: NO PROJECT parameter for " + this.getClass().getCanonicalName());
        }
        
        IVResource file = user.getResource(path,project);
        if (file != null) {
            file.removeWorkingCopy();
        }
    }

}
