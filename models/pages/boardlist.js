'use strict';

const { enableWebring } = require(__dirname+'/../../configs/main.json')
	, { Boards, Webring } = require(__dirname+'/../../db/')
	, limit = 20;

module.exports = async (req, res, next) => {

	const nopage = { ...req.query };
	delete nopage.page;
	const queryString = new URLSearchParams(nopage).toString();

	let page;
	if (req.query.page && Number.isSafeInteger(parseInt(req.query.page))) {
		page = parseInt(req.query.page);
		if (page <= 0) {
			page = 1;
		}
	} else {
		page = 1;
	}
	const offset = (page-1) * limit;

	let sort = {};
	const { ips_sort, pph_sort, posts_sort, search } = req.query;
	if (!(ips_sort || pph_sort || posts_sort)) {
		sort = {
			'ips': -1,
			'pph': -1,
			'sequence_value': -1,
		}
	} else {
		if (ips_sort && (ips_sort == 1 || ips_sort == -1)) {
			sort.ips = ips_sort == 1 ? 1 : -1;
		}
		if (pph_sort && (pph_sort == 1 || pph_sort == -1)) {
			sort.pph = pph_sort == 1 ? 1 : -1;
		}
		if (posts_sort && (posts_sort == 1 || posts_sort == -1)) {
			sort.sequence_value = posts_sort == 1 ? 1 : -1;
		}
	}

	let filter = {};
	if (search && !Array.isArray(search)) {
		filter = {
			'search': search,
		}
	}

	let localBoards, webringBoards, localPages, webringPages;
	try {
		[ localBoards, localPages, webringBoards, webringPages ] = await Promise.all([
			Boards.boardSort(offset, limit, sort, filter),
			Boards.count(),
			enableWebring ? Webring.boardSort(offset, limit, sort, filter) : null,
			enableWebring ? Webring.count() : 0,
		]);
		localPages = Math.ceil(localPages / limit);
		webringPages = Math.ceil(webringPages / limit);
	} catch (err) {
		return next(err);
	}
	const maxPage = Math.max(localPages, webringPages);

	return res.render('boardlist', {
		localBoards,
		webringBoards,
		page,
		maxPage,
		sort,
		search: !Array.isArray(search) ? search : null,
		queryString,
	});

}