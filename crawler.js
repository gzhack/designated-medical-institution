var _ = require('lodash');
var async = require('async');
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var iconv = require('iconv-lite');

var schema = {
  "单位名称": ["div.mima03 > table > tbody > tr:nth-child(1n + 2) > td:nth-child(2)"],
  "等级": ["div.mima03 > table > tbody > tr:nth-child(1n + 2) > td:nth-child(3)"],
  "医疗": ["div.mima03 > table > tbody > tr:nth-child(1n + 2) > td:nth-child(4)"],
  "工伤": [
    "div.mima03 > table > tbody > tr:nth-child(1n + 2) > td:nth-child(5)", 
    function(e) {
      return !e.html().trim()?false:true;
    }],
  "生育": [
    "div.mima03 > table > tbody > tr:nth-child(1n + 2) > td:nth-child(6)",
    function(e) {
      return !e.html().trim()?false:true;
    }],
  "地址": ["div.mima03 > table > tbody > tr:nth-child(1n + 2) > td:nth-child(7)"],
  "行政区": ["div.mima03 > table > tbody > tr:nth-child(1n + 2) > td:nth-child(8)"]
};

var keys = _.keys(schema);

var url = 'http://www.gzyb.net/infoquery/QueryDdyljgData.action';

async.waterfall([
  function(callback) {
    request({
      url: url,
      formData: {
        pageSize: 1000,
        pageNo: 1
      },
      encoding: null
    }, callback);
  }, function(res, body, callback) {
    if (res.statusCode != 200) return callback(new Error(res.statusCode));
    var isGBK = res.headers['content-type'].toUpperCase().indexOf('GBK')>-1;

    callback(null, isGBK?iconv.decode(body, 'GBK'):body.toString());
  }, function(html, callback) {
    var $ = cheerio.load(html);

    var result = {};

    _.forEach(schema, function(config, key) {
      var selector = config[0];
      result[key] = $(selector).map(function(i, el) {
        var f = config[1];
        if (f) return f($(el));
        return $(el).text().trim();
      }).get();
    });

    return callback(null, _.map(result[keys[0]], function(val, index) {
        var row = {};
        _.forEach(keys, function(key) {
          row[key] = result[key][index];
        });
        return row;
      }));
  }], function(err, data) {
    if (err) return console.dir(err);

    var result = {
      timeUpdated: Date.now(),
      count: data.length,
      result: data
    };

    fs.writeFile('data.json', JSON.stringify(result, null, 2), function(err) {
      if (err) return console.dir(err);
      console.log('success');
    });
  });