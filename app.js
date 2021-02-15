const express = require('express')
const app = express()
const port = 3000
var bodyParser = require('body-parser')
var nodemailer = require('nodemailer');
var inlineBase64 = require('nodemailer-plugin-inline-base64');
app.use(express.static('public'));
app.use(bodyParser.json({limit:'10mb'}))

app.get('/', (req, res) => {
    res.sendFile( __dirname + "/public/" + "index.html" );

})
app.post('/sendEmail', (req, res) => {
  var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'm.xingster@gmail.com',
      pass: 'mikeman2005'
    }
  });
  transporter.use('compile', inlineBase64())
  var mailOptions = {
    from: 'm.xingster@gmail.com',
    to: req.body.email,
    subject: new Date().toLocaleDateString('en-US')+' Workout Report',
    html: req.body.content
  };
  
  transporter.sendMail(mailOptions, function(error, info){
    if (error) {
      console.log(error);
    } else {
      res.send('Email sent!');
    }
  });
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})