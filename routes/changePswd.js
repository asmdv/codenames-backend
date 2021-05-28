const express = require("express");
const mysql = require('mysql');
const path = require('path');
const Router = express.Router();
const db = require('../config/connectDB');

Router.get('/:id/updatePassword', function(req, res) {
    db.query('SELECT Password FROM User WHERE UserID = ?', [req.params.id], function(err, result, fields) {
        if(result.length > 0) {
            res.sendFile(path.resolve("views/account/changePswd.html"));
        } else {
            res.send('Invalid ID');
        }
    });
});

Router.post('/:id/updated', function(req, res) {
    db.query('SELECT Password FROM User WHERE UserID = ?', [req.params.id], function(err, result, fields) {
        var pswd = result[0].Password;
        console.log('Current Password : ' + pswd);
    
        var curr_pswd = req.body.current;
        var new_pswd = req.body.confirm;
        if(curr_pswd === pswd) {
            if(curr_pswd === new_pswd) {
                return res.json({
                    success: 0, 
                    message: "Same password as current"
                });
            } else {
                var sql = `UPDATE User SET Password = '${new_pswd}' WHERE UserID = ${req.params.id}`;
                db.query(sql, (err, result) => {
                    if(err) throw err;
                    return res.json({
                        success: 0, 
                        message: "Password updated"
                    });
                });
            }
        } else {
            return res.json({
                success: 0, 
                message: "Current Password Does Not Match."
            });
        }
    });
});

module.exports = Router;