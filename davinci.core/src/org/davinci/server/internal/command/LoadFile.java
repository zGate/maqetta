package org.davinci.server.internal.command;

import java.io.IOException;
import java.io.InputStream;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.davinci.server.Command;
import org.davinci.server.IVResource;
import org.davinci.server.user.User;

public class LoadFile extends Command {

    @Override
    public void handleCommand(HttpServletRequest req, HttpServletResponse resp, User user) throws IOException {
        String path = req.getParameter("path");
        String project = req.getParameter("project");
        if(project==null){
        	System.err.println("Error: NO PROJECT parameter for " + this.getClass().getCanonicalName());
        }
        IVResource file = user.getResource(path,project);

        if (file.exists()) {
            InputStream is = file.getInputStreem();
            Command.transferStreams(is, resp.getOutputStream(), true);
        } else {
            resp.sendError(HttpServletResponse.SC_NOT_FOUND);
        }

    }

}
