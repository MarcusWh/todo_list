const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.set("view engine", "ejs");



mongoose.connect(dburi, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('Connected to MongoDB');
    }).catch((err) => {
        console.error("Error connecting to database.", err);
    })

const itemSchema = new mongoose.Schema({
    entry: {
        type: String,
        required: [true, "Item required"]
    }
});

const Item = mongoose.model("Item", itemSchema);

const listSchema = {
    name: String,
    items: [itemSchema]
}

const List = mongoose.model("List", listSchema);

const defaultItem = new Item({ entry: "Welcome to your todo list!" });

app.get('/', async (req, res) => {
    let today = new Date();
    let currentDay = today.getDay();
    let dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    try {
        const items = await Item.find({}).exec();
        if (items.length === 0) {
            try {
                await defaultItem.save();
                res.redirect("/");
            } catch (err) {
                console.error(err);
                res.send(err);
            }
        } else {
            res.render("list.ejs", { entries: items, listTitle: "Today" });
        }
    } catch (err) {
        console.error('Error retrieving todo items:', err);
        res.status(500).send('Error retrieving todo items');
    }
});

app.get("/:customListName", async (req,res) => {
    const customListName = _.capitalize(req.params.customListName);
    const list = await List.findOne({name: customListName});

    if (list){
        res.render("list.ejs", {entries: list.items, listTitle: customListName});
    }else{
        const list = new List({
            name: customListName,
            items: [defaultItem]
        })
        try{
            await list.save();
            res.redirect("/"+customListName);
            console.log("new list saved with name "+customListName);
        }catch (err){
            console.error(err);
        }
    }    
})

app.post("/", async (req, res) => {
    const itemName = req.body.listItem;
    const listName = req.body.listType;
    const newItem = new Item({ entry: itemName });

    if (listName === "Today"){
        try {
            await newItem.save();
            res.redirect("/");
        } catch (err) {
            console.error(err);
            res.send(err);
        }
    }else{
        const foundList = await List.findOne({ name: listName });
        foundList.items.push(newItem); // Update the items array directly
        try {
            await foundList.save(); // Save the updated list
            res.redirect("/" + listName);
        } catch (err) {
            console.error(err);
        }
    }
});

app.post("/delete", async (req, res) => {
    const checkItemId = req.body.checkbox;
    const listType = req.body.listType;
    
    if (listType === "Today") {
        try {
            await Item.deleteOne({ _id: checkItemId });
            res.redirect("/");
        } catch (err) {
            console.error(err);
            res.send(err);
        }
    } else {
        try {
            const foundList = await List.findOne({ name: listType });
            foundList.items = foundList.items.filter(item => item._id != checkItemId);
            await foundList.save(); // Save the updated list
            res.redirect("/" + listType);
        } catch (err) {
            console.error(err);
        }
    }
});


app.listen(3000, () => {
    console.log("server started on 3000")
});