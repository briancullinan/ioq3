var LibrarySys = {
	$SYS__deps: ['$Browser', '$SYSC'],
	$SYS: {
		timeBase: null,
		DoXHR: function (url, opts) {
			if (!url) {
				return opts.onload(new Error('Must provide a URL'));
			}

			var http = require('http');

			http.get(url, function (res) {
				var buf = [];

				res.on('data', function (data) {
					buf.push(data);
				});

				res.on('end', function () {
					var err = null;
					var data;

					if (!(res.statusCode >= 200 && res.statusCode < 300)) {
						err = new Error('Couldn\'t load ' + url + '. Status: ' + res.statusCode);
					} else {
						var buffer = Buffer.concat(buf);

						// Manually parse out a request expecting a JSON response.
						if (opts.dataType === 'json') {
							var str = buffer.toString();
							try {
								data = JSON.parse(str);
							} catch (e) {
								err = e;
							}
						} else {
							// Convert from node Buffer -> ArrayBuffer.
							data = (new Uint8Array(buffer)).buffer;
						}
					}

					if (opts.onload) {
						opts.onload(err, data);
					}
				});
			});
		},
		mount: function (fs_homepath) {
			var path = require('path');
			var localPath = path.resolve(fs_homepath);

			// make sure the local path exists
			SYSC.mkdirp(localPath);

			try {
				FS.mount(NODEFS, { root: localPath }, fs_homepath);
			} catch (e) {
				if (!(e instanceof FS.ErrnoError) || e.errno !== ERRNO_CODES.EBUSY) {
					SYSC.Error('fatal', e.message || e);
				}
			}

		},
	},
	Sys_PlatformInit: function () {
		_CON_SetIsTTY(process.stdin.isTTY);
	},
	Sys_PlatformExit: function () {
	},
	Sys_FS_Startup__deps: ['$Browser', '$FS', '$PATH', '$SYSC'],
	Sys_FS_Startup: function (cb) {
		// mount a persistable fs into base if not already mounted
		var fs_basepath = UTF8ToString(_Cvar_VariableString(
			allocate(intArrayFromString('fs_basepath'), 'i8', ALLOC_STACK)));
		SYS.mount(fs_basepath);
		var fs_homepath = UTF8ToString(_Cvar_VariableString(
			allocate(intArrayFromString('fs_homepath'), 'i8', ALLOC_STACK)));
		SYS.mount(fs_homepath);
		
		// TODO: remove this
		SYSC.FS_Startup(function (err) {
			if (err) {
				// FIXME cb_free_context(cb)
				SYSC.Error('fatal', err);
				return;
			}

			SYSC.ProxyCallback(cb);
		});
	},
	Sys_FS_Shutdown__deps: ['$Browser', '$SYSC'],
	Sys_FS_Shutdown: function (cb) {
		var name = allocate(intArrayFromString('fs_homepath'), 'i8', ALLOC_STACK);
		var fs_homepath = UTF8ToString(_Cvar_VariableString(name));
		
		FS.unmount(fs_homepath);

		SYSC.FS_Shutdown(function (err) {
			if (err) {
				SYSC.Error('fatal', err);
				return;
			}

			SYSC.ProxyCallback(cb);
		});
	},
	Sys_Milliseconds: function () {
		var time = process.hrtime();

		if (!SYS.timeBase) {
			SYS.timeBase = time[0] * 1000 + parseInt(time[1] / 1000000, 10);
		}

		return (time[0] * 1000 + parseInt(time[1] / 1000000, 10)) - SYS.timeBase;
	},
	Sys_GetCurrentUser: function () {
		var stack = stackSave();
		var ret = allocate(intArrayFromString('player'), 'i8', ALLOC_STACK);
		stackRestore(stack);
		return ret;
	},
	Sys_Dialog: function (type, message, title) {
		SYSC.Error('SYS_Dialog not implemented');
	},
	Sys_ErrorDialog: function (error) {
		error = UTF8ToString(error);
		console.error(error);
		process.exit();
	}
};

autoAddDeps(LibrarySys, '$SYS');
mergeInto(LibraryManager.library, LibrarySys);
