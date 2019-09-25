const express=require('express');
const expressGraphQL=require('express-graphql');
const path=require('path');
const bodyParser = require('body-parser');
const app=express();
const schema =require('./schema');
const cors = require( `cors` );
app.use( cors() );
app.use('/graphql',expressGraphQL
({
    schema,
    graphiql:true
}));
app.use(express.static(path.resolve(__dirname, './build')));

app.get('*', (req, res) => {
console.log("REACHED IN *")
const filePath = path.resolve(__dirname, './build', 'index.html');
res.sendFile(filePath);
});
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.listen(5000, () => console.log(`Example app listening on port 5000!`))