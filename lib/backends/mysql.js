/* SQL Middleware Framework by @jheusala */

/*
 * Copyright (C) 2011 by Jaakko-Heikki Heusala <jheusala@iki.fi>
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy of 
 * this software and associated documentation files (the "Software"), to deal in 
 * the Software without restriction, including without limitation the rights to 
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies 
 * of the Software, and to permit persons to whom the Software is furnished to do 
 * so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all 
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE 
 * SOFTWARE.
 */

/* for node-lint */
/*global Buffer: false, clearInterval: false, clearTimeout: false, console: false, global: false, module: false, process: false, querystring: false, require: false, setInterval: false, setTimeout: false, util: false, __filename: false, __dirname: false */

/* MySQL backend builder */
module.exports = function(conf, options) {
	options = options || {};
	var client;
	return {
		'type': 'mysql',
		'placeholder': function(i) { return '?'; },
		'connect': function(cb) {
			if(!client) {
				client = require('mysql').createClient(conf);
			}
			cb();
		},
		'query': function(query, values, cb) {
			if(!client) {
				return cb(new TypeError("!client"));
			}
			client.query(query, values, function(err, result) {
				if(err && options.debug) {
					console.log('query failed with: ' + err);
				}
				cb(err, result);
			});
		},
		'disconnect': function(cb) {
			if(!client) {
				return cb(new TypeError("!client"));
			}
			client.end(function(err) {
				cb(err);
				client = undefined;
			});
		}
	};
};
	
/* EOF */
