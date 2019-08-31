'use strict';

process
	.on('uncaughtException', console.error)
	.on('unhandledRejection', console.error);

const msTime = require(__dirname+'/helpers/mstime.js')
	, deleteCaptchas = require(__dirname+'/helpers/captcha/deletecaptchas.js')
	, Mongo = require(__dirname+'/db/db.js')
	, buildQueue = require(__dirname+'/queue.js');

(async () => {

	console.log('CONNECTING TO MONGODB');
	await Mongo.connect();
	const Files = require(__dirname+'/db/files.js');

	console.log('STARTING SCHEDULES');

	//add 5 minute repeatable job to queue (queue will prevent duplicate)
	buildQueue.push({
		'task': 'buildHomepage',
		'options': {}
	}, {
		'repeat': {
			'cron': '*/5 * * * *'
		}
	});

	//delete files for expired captchas
	setInterval(async () => {
		try {
			await deleteCaptchas();
		} catch (e) {
			console.error(e);
		}
	}, msTime.minute*5);

	setInterval(async () => {
		try {
//todo: make this not a race condition, but it only happens daily so ¯\_(ツ)_/¯
			const files = await Files.db.aggregate({
				'count': {
					'$lte': 1
				}
			}, {
				'projection': {
					'count': 0,
					'size': 0
				}
			}).toArray().then(res => {
				return res.map(x => x._id);
			});
			await Files.db.removeMany({
				'count': {
					'$lte': 0
				}
			});
			await Promise.all(files.map(async filename => {
				return Promise.all([
					remove(`${uploadDirectory}img/${filename}`),
					remove(`${uploadDirectory}img/thumb-${filename.split('.')[0]}.jpg`)
				])
			}));
			console.log('Deleted unused files:', files);
		} catch (e) {
			console.error(e);
		}
	}, msTime.day);

})();
