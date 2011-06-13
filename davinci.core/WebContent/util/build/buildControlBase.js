define(["dojo", "./stringify"], function(dojo, stringify) {
	var bc= {
		startTimestamp: new Date(),

		paths:{},
		destPathTransforms:[],
		packageMap:{},

		// resources
		resources:{},
		resourcesByDest:{},
		amdResources:{},

		// logging
		errorCount:0,
		warnCount:0,
		messages:[],

		closureCompilerPath:"../closureCompiler/compiler.jar",
		maxOptimizationProcesses:5,
		buildReportDir:".",
		buildReportFilename:"build-report.txt",
		optimizerOutput:"",

		writeln:function(text) {
			bc.messages.push(text);
			console.log(text);
		},

		log:function(prefix, args) {
			bc.writeln(prefix + (dojo.isString(args[0]) ? args[0] : stringify(args[0])));
			for (var arg, i= 1; i<args.length; i++) {
				arg= args[i];
				(arg instanceof Error) && (arg= arg+"");
				bc.writeln(dojo.isString(arg) ? arg : stringify(args));
			}
			if (args.length>1) {
				bc.writeln(".");
			}
		},

		logInfo:function() {
			bc.log("", arguments);
		},

		logWarn: function() {
			bc.warnCount++;
			bc.log("WARN: ", arguments);
		},

		logError: function() {
			bc.errorCount++;
			bc.log("ERROR: ", arguments);
		}
	};
	return bc;
});