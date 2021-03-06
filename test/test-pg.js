/* MySQL backend tests */

var config = require('./config.js'),
    testCase = require('nodeunit').testCase,
	sqlmw = require('../lib/sqlmw.js'),
	sys = require('sys');

module.exports = testCase({
	setUp: function (callback) {
		var mytestcase = this;
		mytestcase.table = 'test_table';
		mytestcase.sql = sqlmw('pg', config.pg, {'debug':false});
		mytestcase.sql.group(
			mytestcase.sql.connect(),
			mytestcase.sql.query('CREATE TEMP TABLE '+mytestcase.table+" (id SERIAL UNIQUE, title VARCHAR(255), text TEXT, created TIMESTAMP WITH TIME ZONE, PRIMARY KEY (id))")
		)({}, function(err) {
			if(err) console.error('Error: ' + err);
			callback(err);
		});
	},
	tearDown: function (callback) {
		var mytestcase = this;
		mytestcase.sql.group(
			mytestcase.sql.query('DISCARD TEMP'),
			mytestcase.sql.disconnect()
		)({}, function(err) {
			if(err) console.error('Error: ' + err);
			callback(err);
		});
	},
	/* Test MySQL backend API */
	backend: function(test){
		var mytestcase = this;
		var backend = mytestcase.sql.backend;
		test.expect(6);
		test.ok(backend, "backend invalid");
		test.strictEqual(backend.type, 'pg');
		test.strictEqual(typeof backend.placeholder, 'function', "Missing .placeholder");
		test.strictEqual(typeof backend.connect, 'function', "Missing .connect");
		test.strictEqual(typeof backend.query, 'function', "Missing .query");
		test.strictEqual(typeof backend.disconnect, 'function', "Missing .disconnect");
		test.done();
	},
	/* Test INSERT with values and callback function */
	query_insert_with_options_callback: function(test){
		var mytestcase = this;
		var date = new Date();
		date.setTime(1315790265000);
		test.expect(18);
		var cb = mytestcase.sql.query('INSERT INTO '+mytestcase.table+' (title, text, created) VALUES (:title, :text, :created)');
		test.ok(cb, "Failed to create callback");
		test.strictEqual(typeof cb, 'function', "Failed to create callback");
		cb({'title':'Hello world', 'text':'This is a test article.', 'created':date}, function(err, state) {
			test.ok(!err, "Error: " + err);
			test.ok(state, "state invalid");
			//test.strictEqual(state._insertId, 1, "state._insertId failed");
			
			var select = mytestcase.sql.query('SELECT * FROM '+mytestcase.table);
			test.ok(select, "Failed to create callback");
			test.strictEqual(typeof select, 'function', "Failed to create callback");
			select(function(err, state) {
				test.ok(!err, "Error: " + err);
				test.ok(state);
				test.ok(state._rows);
				test.ok(state._results);
				test.strictEqual( state._rows.length, 1);
				test.strictEqual( state._results.length, 1);
				test.strictEqual( state._results[0].length, 1);
				test.strictEqual( sys.inspect(state._rows[0]), sys.inspect(state._results[0][0]), "Article #1 failed");
				
				test.strictEqual( state._rows[0].id, 1);
				test.strictEqual( state._rows[0].title, 'Hello world');
				test.strictEqual( state._rows[0].text, 'This is a test article.');
				test.strictEqual( sys.inspect(state._rows[0].created), 'Mon, 12 Sep 2011 01:17:45 GMT');
				test.done();
			});


		});
	},
	/* Test SELECT with empty values and callback function */
	query_select_with_emptyoptions_callback: function(test){
		var mytestcase = this;
		test.expect(24);
		var cb = mytestcase.sql.group(
			mytestcase.sql.query('INSERT INTO '+mytestcase.table+" (title, text, created) "+
				"VALUES ('Hello World', 'Test article #1', '2011-06-08 12:10:00'), "+
				"('Second title', 'Test article #2', '2011-07-15 09:34:39'), "+
				"('Third title', 'Test article #3', '2011-09-07 20:00:00')"),
			mytestcase.sql.query('SELECT * FROM '+mytestcase.table + ' ORDER BY id')
		);
		test.ok(cb, "Failed to create callback");
		test.strictEqual(typeof cb, 'function', "Failed to create callback");
		cb({}, function(err, state) {
			test.ok(!err, "Error: " + err);
			test.ok(state, "state");
			test.ok(state._rows, "state._rows");
			test.ok(state._results, "state._results");
			test.strictEqual( state._rows.length, 3, "state._rows.length, 3");
			test.strictEqual( state._results.length, 1, "state._results.length, 1");
			test.strictEqual( state._results[0].length, 3, "state._results[0].length, 3");
			test.strictEqual( sys.inspect(state._rows[0]), sys.inspect(state._results[0][0]), "Article #1 failed");
			test.strictEqual( sys.inspect(state._rows[1]), sys.inspect(state._results[0][1]), "Article #2 failed");
			test.strictEqual( sys.inspect(state._rows[2]), sys.inspect(state._results[0][2]), "Article #3 failed");
			
			test.strictEqual( state._rows[0].id, 1, "state._rows[0].id, 1");
			test.strictEqual( state._rows[0].title, 'Hello World');
			test.strictEqual( state._rows[0].text, 'Test article #1');
			test.strictEqual( sys.inspect(state._rows[0].created), 'Wed, 08 Jun 2011 09:10:00 GMT');
			
			test.strictEqual( state._rows[1].id, 2, "state._rows[1].id, 2");
			test.strictEqual( state._rows[1].title, 'Second title');
			test.strictEqual( state._rows[1].text, 'Test article #2');
			test.strictEqual( sys.inspect(state._rows[1].created), 'Fri, 15 Jul 2011 06:34:39 GMT');
			
			test.strictEqual( state._rows[2].id, 3, "state._rows[2].id, 3");
			test.strictEqual( state._rows[2].title, 'Third title');
			test.strictEqual( state._rows[2].text, 'Test article #3');
			test.strictEqual( sys.inspect(state._rows[2].created), 'Wed, 07 Sep 2011 17:00:00 GMT');
			
			test.done();
		});
	},
	/* Test SELECT+LIMIT with selection and callback function */
	query_select_single_with_options_callback: function(test){
		var mytestcase = this;
		test.expect(20);
		var cb = mytestcase.sql.group(
			mytestcase.sql.query('INSERT INTO '+mytestcase.table+" (title, text, created) "+
				"VALUES ('Hello World', 'Test article #1', '2011-06-08 12:10:00'), "+
				"('Second title', 'Test article #2', '2011-07-15 09:34:39'), "+
				"('Third title', 'Test article #3', '2011-09-07 20:00:00')"),
			mytestcase.sql.query('SELECT * FROM '+mytestcase.table + ' WHERE id=:id LIMIT 1')
		);
		test.ok(cb, "Failed to create callback");
		test.strictEqual(typeof cb, 'function', "Failed to create callback");
		cb({'id':1}, function(err, state) {
			test.ok(!err, "Error: " + err);
			test.ok(state);
			test.ok(state._rows);
			test.ok(state._results);
			test.strictEqual( state._rows.length, 1);
			test.strictEqual( state._results.length, 1);
			test.strictEqual( state._results[0].length, 1);
			test.strictEqual( sys.inspect(state._rows[0]), sys.inspect(state._results[0][0]), "Article #1 failed");
			test.strictEqual( sys.inspect(state._rows[1]), sys.inspect(state._results[0][1]), "Article #2 failed");
			test.strictEqual( sys.inspect(state._rows[2]), sys.inspect(state._results[0][2]), "Article #3 failed");
			
			test.strictEqual( state._rows[0].id, 1);
			test.strictEqual( state._rows[0].title, 'Hello World');
			test.strictEqual( state._rows[0].text, 'Test article #1');
			test.strictEqual( sys.inspect(state._rows[0].created), 'Wed, 08 Jun 2011 09:10:00 GMT');
			
			test.strictEqual( state.id, 1);
			test.strictEqual( state.title, 'Hello World');
			test.strictEqual( state.text, 'Test article #1');
			test.strictEqual( sys.inspect(state.created), 'Wed, 08 Jun 2011 09:10:00 GMT');
			
			test.done();
		});
	},
	/* Test DELETE with selection and callback function */
	query_delete_with_options_callback: function(test){
		var mytestcase = this;
		test.expect(19);
		var cb = mytestcase.sql.group(
			mytestcase.sql.query('INSERT INTO '+mytestcase.table+" (title, text, created) "+
				"VALUES ('Hello World', 'Test article #1', '2011-06-08 12:10:00'), "+
				"('Second title', 'Test article #2', '2011-07-15 09:34:39'), "+
				"('Third title', 'Test article #3', '2011-09-07 20:00:00')"),
			mytestcase.sql.query('DELETE FROM '+mytestcase.table+' WHERE id=:id'),
			mytestcase.sql.query('SELECT * FROM '+mytestcase.table + ' ORDER BY id')
		);
		test.ok(cb, "Failed to create callback");
		test.strictEqual(typeof cb, 'function', "Failed to create callback");
		cb({'id':2}, function(err, state) {
			test.ok(!err, "Error: " + err);
			test.ok(state);
			test.ok(state._rows);
			test.ok(state._results);
			test.strictEqual( state._rows.length, 2);
			test.strictEqual( state._results.length, 1);
			test.strictEqual( state._results[0].length, 2);
			test.strictEqual( sys.inspect(state._rows[0]), sys.inspect(state._results[0][0]), "Article #1 failed");
			test.strictEqual( sys.inspect(state._rows[1]), sys.inspect(state._results[0][1]), "Article #2 failed");
			
			test.strictEqual( state._rows[0].id, 1);
			test.strictEqual( state._rows[0].title, 'Hello World');
			test.strictEqual( state._rows[0].text, 'Test article #1');
			test.strictEqual( sys.inspect(state._rows[0].created), 'Wed, 08 Jun 2011 09:10:00 GMT');
			
			test.strictEqual( state._rows[1].id, 3);
			test.strictEqual( state._rows[1].title, 'Third title');
			test.strictEqual( state._rows[1].text, 'Test article #3');
			test.strictEqual( sys.inspect(state._rows[1].created), 'Wed, 07 Sep 2011 17:00:00 GMT');
			
			test.done();
		});
	},
	/* Test UPDATE with values and callback function */
	query_update_with_options_callback: function(test){
		var mytestcase = this;
		test.expect(24);
		var cb = mytestcase.sql.group(
			mytestcase.sql.query('INSERT INTO '+mytestcase.table+" (title, text, created) "+
				"VALUES ('Hello World', 'Test article #1', '2011-06-08 12:10:00'), "+
				"('Second title', 'Test article #2', '2011-07-15 09:34:39'), "+
				"('Third title', 'Test article #3', '2011-09-07 20:00:00')"),
			mytestcase.sql.query('UPDATE '+mytestcase.table+' SET title=:new_title WHERE id=:id'),
			mytestcase.sql.query('SELECT * FROM '+mytestcase.table + ' ORDER BY id')
		);
		test.ok(cb, "Failed to create callback");
		test.strictEqual(typeof cb, 'function', "Failed to create callback");
		cb({'id':2, 'new_title':'Modified title'}, function(err, state) {
			test.ok(!err, "Error: " + err);
			test.ok(state);
			test.ok(state._rows);
			test.ok(state._results);
			test.strictEqual( state._rows.length, 3, "state._rows.length failed");
			test.strictEqual( state._results.length, 1, "state._results.length failed");
			test.strictEqual( state._results[0].length, 3, "state._results[0].length failed");
			test.strictEqual( sys.inspect(state._rows[0]), sys.inspect(state._results[0][0]), "Article #1 failed");
			test.strictEqual( sys.inspect(state._rows[1]), sys.inspect(state._results[0][1]), "Article #2 failed");
			test.strictEqual( sys.inspect(state._rows[2]), sys.inspect(state._results[0][2]), "Article #3 failed");
			
			test.strictEqual( state._rows[0].id, 1);
			test.strictEqual( state._rows[0].title, 'Hello World');
			test.strictEqual( state._rows[0].text, 'Test article #1');
			test.strictEqual( sys.inspect(state._rows[0].created), 'Wed, 08 Jun 2011 09:10:00 GMT');
			
			test.strictEqual( state._rows[1].id, 2);
			test.strictEqual( state._rows[1].title, 'Modified title');
			test.strictEqual( state._rows[1].text, 'Test article #2');
			test.strictEqual( sys.inspect(state._rows[1].created), 'Fri, 15 Jul 2011 06:34:39 GMT');
			
			test.strictEqual( state._rows[2].id, 3);
			test.strictEqual( state._rows[2].title, 'Third title');
			test.strictEqual( state._rows[2].text, 'Test article #3');
			test.strictEqual( sys.inspect(state._rows[2].created), 'Wed, 07 Sep 2011 17:00:00 GMT');
			
			test.done();
		});
	},
	/* Test SELECT without values and with callback function */
	query_select_without_options_with_callback: function(test){
		var mytestcase = this;
		test.expect(24);
		var cb = mytestcase.sql.group(
			mytestcase.sql.query('INSERT INTO '+mytestcase.table+" (title, text, created) "+
				"VALUES ('Hello World', 'Test article #1', '2011-06-08 12:10:00'), "+
				"('Second title', 'Test article #2', '2011-07-15 09:34:39'), "+
				"('Third title', 'Test article #3', '2011-09-07 20:00:00')"),
			mytestcase.sql.query('SELECT * FROM '+mytestcase.table + ' ORDER BY id')
		);
		test.ok(cb, "Failed to create callback");
		test.strictEqual(typeof cb, 'function', "Failed to create callback");
		cb(function(err, state) {
			test.ok(!err, "Error: " + err);
			test.ok(state, "state");
			test.ok(state._rows, "state._rows");
			test.ok(state._results, "state._results");
			test.strictEqual( state._rows.length, 3, "state._rows.length, 3");
			test.strictEqual( state._results.length, 1, "state._results.length, 1");
			test.strictEqual( state._results[0].length, 3, "state._results[0].length, 3");
			test.strictEqual( sys.inspect(state._rows[0]), sys.inspect(state._results[0][0]), "Article #1 failed");
			test.strictEqual( sys.inspect(state._rows[1]), sys.inspect(state._results[0][1]), "Article #2 failed");
			test.strictEqual( sys.inspect(state._rows[2]), sys.inspect(state._results[0][2]), "Article #3 failed");
			
			test.strictEqual( state._rows[0].id, 1, "state._rows[0].id, 1");
			test.strictEqual( state._rows[0].title, 'Hello World');
			test.strictEqual( state._rows[0].text, 'Test article #1');
			test.strictEqual( sys.inspect(state._rows[0].created), 'Wed, 08 Jun 2011 09:10:00 GMT');
			
			test.strictEqual( state._rows[1].id, 2, "state._rows[1].id, 2");
			test.strictEqual( state._rows[1].title, 'Second title');
			test.strictEqual( state._rows[1].text, 'Test article #2');
			test.strictEqual( sys.inspect(state._rows[1].created), 'Fri, 15 Jul 2011 06:34:39 GMT');
			
			test.strictEqual( state._rows[2].id, 3, "state._rows[2].id, 3");
			test.strictEqual( state._rows[2].title, 'Third title');
			test.strictEqual( state._rows[2].text, 'Test article #3');
			test.strictEqual( sys.inspect(state._rows[2].created), 'Wed, 07 Sep 2011 17:00:00 GMT');
			
			test.done();
		});
	},
	/* Test SELECT with values and with callback function */
	query_select_single_without_options_callback: function(test){
		var mytestcase = this;
		test.expect(20);
		var cb = mytestcase.sql.group(
			mytestcase.sql.query('INSERT INTO '+mytestcase.table+" (title, text, created) "+
				"VALUES ('Hello World', 'Test article #1', '2011-06-08 12:10:00'), "+
				"('Second title', 'Test article #2', '2011-07-15 09:34:39'), "+
				"('Third title', 'Test article #3', '2011-09-07 20:00:00')"),
			mytestcase.sql.query('SELECT * FROM '+mytestcase.table + ' WHERE id=1 LIMIT 1')
		);
		test.ok(cb, "Failed to create callback");
		test.strictEqual(typeof cb, 'function', "Failed to create callback");
		cb(function(err, state) {
			test.ok(!err, "Error: " + err);
			test.ok(state);
			test.ok(state._rows);
			test.ok(state._results);
			test.strictEqual( state._rows.length, 1);
			test.strictEqual( state._results.length, 1);
			test.strictEqual( state._results[0].length, 1);
			test.strictEqual( sys.inspect(state._rows[0]), sys.inspect(state._results[0][0]), "Article #1 failed");
			test.strictEqual( sys.inspect(state._rows[1]), sys.inspect(state._results[0][1]), "Article #2 failed");
			test.strictEqual( sys.inspect(state._rows[2]), sys.inspect(state._results[0][2]), "Article #3 failed");
			
			test.strictEqual( state._rows[0].id, 1);
			test.strictEqual( state._rows[0].title, 'Hello World');
			test.strictEqual( state._rows[0].text, 'Test article #1');
			test.strictEqual( sys.inspect(state._rows[0].created), 'Wed, 08 Jun 2011 09:10:00 GMT');
			
			test.strictEqual( state.id, 1);
			test.strictEqual( state.title, 'Hello World');
			test.strictEqual( state.text, 'Test article #1');
			test.strictEqual( sys.inspect(state.created), 'Wed, 08 Jun 2011 09:10:00 GMT');
			
			test.done();
		});
	},
	/* Test transaction middlewares */
	transaction_inserts_successful: function(test){
		var mytestcase = this;
		test.expect(24);
		
		var insert = mytestcase.sql.group(
			mytestcase.sql.begin(),
			mytestcase.sql.query('INSERT INTO '+mytestcase.table+" (title, text, created) VALUES ('Hello World', 'Test article #1', '2011-06-08 12:10:00')"),
			mytestcase.sql.query('INSERT INTO '+mytestcase.table+" (title, text, created) VALUES ('Second title', 'Test article #2', '2011-07-15 09:34:39')"),
			mytestcase.sql.query('INSERT INTO '+mytestcase.table+" (title, text, created) VALUES ('Third title', 'Test article #3', '2011-09-07 20:00:00')"),
			mytestcase.sql.commit()
		);
		test.ok(insert, "Failed to create callback");
		test.strictEqual(typeof insert, 'function', "Failed to create callback");
		insert(function(err) {
			if(err) {
				mytestcase.sql.rollback();
				console.log('Error: ' + err);
			}
			
			var select = mytestcase.sql.query('SELECT * FROM '+mytestcase.table)
			select(function(err, state) {
				test.ok(!err, "Error: " + err);
				test.ok(state, "state");

				test.ok(state._rows, "state._rows");
				test.ok(state._results, "state._results");
				test.strictEqual( state._rows.length, 3, "state._rows.length, 3");
				test.strictEqual( state._results.length, 1, "state._results.length, 1");

				test.strictEqual( state._results[0].length, 3, "state._results[0].length, 3");
				test.strictEqual( sys.inspect(state._rows[0]), sys.inspect(state._results[0][0]), "Article #1 failed");
				test.strictEqual( sys.inspect(state._rows[1]), sys.inspect(state._results[0][1]), "Article #2 failed");
				test.strictEqual( sys.inspect(state._rows[2]), sys.inspect(state._results[0][2]), "Article #3 failed");
				
				test.strictEqual( state._rows[0].id, 1, "state._rows[0].id, 1");
				test.strictEqual( state._rows[0].title, 'Hello World');
				test.strictEqual( state._rows[0].text, 'Test article #1');
				test.strictEqual( sys.inspect(state._rows[0].created), 'Wed, 08 Jun 2011 09:10:00 GMT');
				
				test.strictEqual( state._rows[1].id, 2, "state._rows[1].id, 2");
				test.strictEqual( state._rows[1].title, 'Second title');
				test.strictEqual( state._rows[1].text, 'Test article #2');
				test.strictEqual( sys.inspect(state._rows[1].created), 'Fri, 15 Jul 2011 06:34:39 GMT');
				
				test.strictEqual( state._rows[2].id, 3, "state._rows[2].id, 3");
				test.strictEqual( state._rows[2].title, 'Third title');
				test.strictEqual( state._rows[2].text, 'Test article #3');
				test.strictEqual( sys.inspect(state._rows[2].created), 'Wed, 07 Sep 2011 17:00:00 GMT');
			
				test.done();

			});
			
		});
	},
	/* Test transaction middlewares */
	transaction_inserts_failing: function(test){
		var mytestcase = this;
		test.expect(13);
		
		var insert = mytestcase.sql.group(
			mytestcase.sql.begin(),
			mytestcase.sql.query('INSERT INTO '+mytestcase.table+" (title, text, created) VALUES ('Hello World', 'Test article #1', '2011-06-08 12:10:00')"),
			mytestcase.sql.query('INSERT INTO '+mytestcase.table+" (title, text, created) VALUES ('Second title', 'Test article #2', '2011-07-15 09:34:39')"),
			mytestcase.sql.query('INSERT INTO '+mytestcase.table+" (title, text, created) VALUES ('Third title', 'Test article #3', '2011-09-07 20:00:00')"),
			mytestcase.sql.rollback()
		);
		test.ok(insert, "Failed to create callback");
		test.strictEqual(typeof insert, 'function', "Failed to create callback");
		insert(function(err) {
			if(err) {
				mytestcase.sql.rollback();
			}
			test.ifError(err);
			
			var select = mytestcase.sql.query('SELECT * FROM '+mytestcase.table)
			select(function(err, state) {
				test.ifError(err);
				test.ok(state, "state");
				
				test.ok(state._rows, "state._rows");
				test.ok(state._results, "state._results");
				test.strictEqual( state._rows.length, 0);
				test.strictEqual( state._results.length, 1);
				test.strictEqual( state._results[0].length, 0);
				
				test.strictEqual(state._rows[0], undefined, "state._rows[0]");
				test.strictEqual(state._rows[1], undefined, "state._rows[1]");
				test.strictEqual(state._rows[2], undefined, "state._rows[2]");
				
				test.done();

			});
			
		});
	}
});

/* EOF */
