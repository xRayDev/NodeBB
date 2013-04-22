var RDB = require('./redis.js');

(function(User) {
	var current_uid;

	User.login = function(user) {
		if (current_uid) {
			return global.socket.emit('user.login', {'status': 0, 'message': 'User is already logged in.'});
			
		}

		if (user.username == null || user.password == null) {
			return global.socket.emit('user.login', {'status': 0, 'message': 'Missing fields'});
			
		}

		RDB.get('username:' + user.username + ':uid', function(uid) {
			if (uid == null) {
				return global.socket.emit('user.login', {'status': 0, 'message': 'Username does not exist.'});
				
			}

			RDB.get('uid:' + uid + ':password', function(password) {
				if (user.password != password) {
					return global.socket.emit('user.login', {'status': 0, 'message': 'Incorrect username / password combination.'});
				} else {
					console.log('in');
					return global.socket.emit('user.login', {'status': 1, 'message': 'Logged in!'});
				}
			});
				
		});
				

	};


	User.create = function(username, password) {
		if (current_uid) {
			return; global.socket.emit('user.create', {'status': 0, 'message': 'Only anonymous users can register a new account.'});
		}

		if (username == null || password == null) {
			return; global.socket.emit('user.create', {'status': 0, 'message': 'Missing fields'});
		}


		User.exists(username, function(exists) {
			if (exists) {
				return;
			}

			RDB.incr('global:next_user_id', function(uid) {
				RDB.set('username:' + username + ':uid', uid);
				RDB.set('uid:' + uid + ':username', username);
				RDB.set('uid:' + uid + ':password', password);
				
				RDB.incr('user:count', function(count) {
					io.sockets.emit('user.count', {count: count});
				});

				RDB.lpush('user:users', username);
				io.sockets.emit('user.latest', {username: username});

				global.socket.emit('user.create', {'status': 1});
			});
		});
	};


	User.exists = function(username, callback) {
		User.get_uid_by_username(username, function(exists) {
			exists = !!exists;
			global.socket.emit('user.exists', {exists: exists})

			if (callback) {
				callback(exists);
			}
		});
	};
	User.count = function() {
		RDB.get('user:count', function(count) {
			global.socket.emit('user.count', {count: (count === null) ? 0 : count});
		});
	};
	User.latest = function() {
		RDB.lrange('user:users', 0, 0, function(username) {
			global.socket.emit('user.latest', {username: username});
		});	
	}

	User.get_uid_by_username = function(username, callback) {
		RDB.get('username:' + username + ':uid', callback);
	};


}(exports));