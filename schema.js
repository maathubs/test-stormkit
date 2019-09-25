const graphql = require('graphql');
const { GraphQLObjectType, GraphQLString, GraphQLInt,GraphQLBoolean, GraphQLSchema, GraphQLList } = graphql;
var mongoose = require('mongoose')
    , Admin = mongoose.mongo.Admin;
var Schema = mongoose.Schema
const UserType = new GraphQLObjectType({
    name: 'User',
    fields: {
        name: { type: GraphQLString },
        sizeOnDisk: { type: GraphQLInt },
        empty: { type: GraphQLBoolean }
    }
});
const CollectionType = new GraphQLObjectType({
    name: 'Collection',
    fields: {
        name: { type: GraphQLString },
        type: { type: GraphQLString },    
    }
});

const RootQuery = new GraphQLObjectType({
    name: 'RootQueryType',
    fields:()=>( {
        getuser: {
            type: GraphQLList(UserType),
            args: { host: { type: GraphQLString } ,port:{type: GraphQLString}},
            resolve(parentValue, args) {
                array = getDatabaseList(args.host,args.port);
                return array ;  
            }
        },
        getcollection: {
            type:GraphQLList(CollectionType),
            args: { host: { type: GraphQLString } ,port:{type: GraphQLString},dbname:{type: GraphQLString}},
            resolve(parentValue,args){
                array=getCollections(args.host,args.port,args.dbname)
                return array
            }
        }
    })
})

const mutation = new GraphQLObjectType({
    name: 'Mutation',
    fields:()=>( {
        adduser: {
            type: GraphQLString,
            args: { host: { type: GraphQLString } ,port:{type: GraphQLString},impHost: { type: GraphQLString },impPort: { type: GraphQLString },impDb:{type:GraphQLString},collectionList:{type:GraphQLString}},
            async resolve(parentValue, args) {
               return await exportDatabase(args.host,args.port,args.impHost,args.impPort,args.impDb,args.collectionList);
            }
        },
    })
})

async function getCollections(host,port,dbname) {
    let promise = new Promise((res, rej) => {
        var mongoose = require('mongoose') , Admin = mongoose.mongo.Admin, Dbs;
        var connection = mongoose.createConnection("mongodb://"+host+":"+port+"/"+dbname);
        connection.on('open', function() {
            console.log('Connected to mongo server.');
            //Trying to get collection names
            connection.db.listCollections().toArray(function (err, names) { 
            //    let resultCollection=[];
               const blacklist = ['system.', 'startup_']
               const cleanNames = names.filter(name => !blacklist.some(s => (name.name).includes(s)));
                    // resultCollection= names.filter( name => !(name.name).includes("system.") ) 
                    mongoose.connect("mongodb://"+host+":"+port+"/"+dbname ,{useNewUrlParser: true});
                    var connection = mongoose.connection;
                    connection.on('error', console.error.bind(console, 'connection error:'));  
                res(cleanNames); 
            })
        });
    });
    let result = await promise; 
    return(result);     
}

async function exportDatabase(exportHost,exportPort,impHost,impPort,impDb,collectionList) {
    return  new Promise((resolve, reject) => {
        for(const each of collectionList.split(',')){
            const name=each
            //GET EXISTING DB CONNECTION 1
            mongoose.connect("mongodb://"+impHost+":"+impPort+"/"+impDb, {useNewUrlParser: true});
            var connection1 = mongoose.connection;
            connection1.on('error', console.error.bind(console, 'connection error:'));
            connection1.once('open', function () {
                require('events').EventEmitter.defaultMaxListeners = 20;
                //GET EXISTING DB COLLECTION-DATA FROM CONNECTION 1
                connection1.db.collection(each, function(err, collection1){
                    collection1.find({}).toArray(function(err, data){
                        //GET NEW DB CONNECTION 2
                        mongoose.connect("mongodb://"+exportHost+":"+exportPort+"/"+"exported"+impDb, {useNewUrlParser: true});
                        var connection2 = mongoose.connection;
                        //CREATE NEW COLLECTION IN CONNECTION 2
                        var newSchema = new Schema({}, { strict: false, collection:each});
                        var newModel = mongoose.model(each, newSchema);
                        //COPY DATA TO NEW COLLECTION IN CONNECTION 2
                        for(const each of data) {
                            connection2.on('error', console.error.bind(console, 'connection error:'));
                            connection2.once('open', function () {
                                var thing = new newModel(each);
                                thing.save().then(async(result)=>{
                                    if(each == data[data.length-1]) {
                                        let array = await getDatabaseList(exportHost,exportPort);
                                        resolve(JSON.stringify(array)); 
                                    }
                                }).catch((err)=>{
                                    console.log("ERROR IN CATCH BLOCK",err)
                                })
                            });
                        }
                    })
                });
            });
        }
        
    });
}

async function getDatabaseList(host,port) {
    return new Promise((resolve, reject) => {
        try{
            var mongoose = require('mongoose') , Admin = mongoose.mongo.Admin, Dbs;
            // create a connection to the DB    
            var connection = mongoose.createConnection("mongodb://"+host+":"+port+"/mynewdb", {useNewUrlParser: true});
            connection.on('open', function() {
                // connection established
                new Admin(connection.db).listDatabases(function(err, result) {
                    // database list stored in result.databases
                    Dbs = result.databases; 
                    resolve(Dbs);
                    return Dbs;
                }, (err) => console.log("rejection",err));
            });
            connection.on('error', console.error.bind(console, 'connection error:'));
        } catch(e) {
            reject(null)
        }
    });
}
module.exports = new GraphQLSchema({
    query: RootQuery,
    mutation:mutation
});