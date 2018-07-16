
// Use Parse.Cloud.define to define as many cloud functions as you want.
// For example:
Parse.Cloud.define("hello", function(request, response) {
  response.success("Hello world!");
});



Parse.Cloud.define("getToDosForUser", function(request, response) {
    var currentUser = request.user;
    var date = request.params.date;
    var query = new Parse.Query("ToDo");
    query.equalTo("user", currentUser);
    query.lessThan("createdAt", date);
    query.descending("createdAt");
    query.limit(100);
    query.include("user");
    query.find({
        useMasterKey: true,
        success: function (results) {
            var resultsArray = [];
            for (var i = 0; i < results.length; i++) {
                var todo = results[i];
                var tempUser = todo.get("user");
                var jsonUser = tempUser.toJSON();
                delete jsonUser.email;
                delete jsonUser.username;

                jsonUser.__type = "Object";
                jsonUser.className = "_User";

                var cleanedTodo = todo.toJSON();
                cleanedTodo.user = jsonUser;
                cleanedTodo.__type = "Object";
                cleanedTodo.className = "ToDo";
                resultsArray.push(cleanedTodo);
            }
            response.success(resultsArray);
        },
        error: function (error) {
            response.error("- Error: " + error.code + " " + error.message);
        }
    });
});

Parse.Cloud.define("createToDosForUser", function(request, response) {
    var currentUser = request.user;
    var todoString = request.params.todoString;
    var ToDo = Parse.Object.extend("ToDo");
    var todo = new ToDo();
    todo.set("user", currentUser);
    todo.set("userObjectId", currentUser.id);
    todo.set("todoDescription", todoString);
    todo.set("finished", false);
    todo.save(null, {
        useMasterKey: true,
        success: function (object) {
            response.success([todo]);
        },
        error: function (object, error) {
            response.error("Got an error " + error.code + " : " + error.description);
        }
    });
});

Parse.Cloud.define("markToDoAsCompletedForUser", function(request, response) {
    var currentUser = request.user;
    var todoId = request.params.todoId;
    var query = new Parse.Query("ToDo");
    query.equalTo("user", currentUser);
    query.equalTo("objectId", todoId);
    query.equalTo("finished", false);
    query.limit(1);
    query.find({
        useMasterKey: true,
        success: function (results) {
            if (results.length > 0) {
                var todo = results[0];
                todo.set("finished", true);
                var date = new Date();
                todo.set("finishedDate", date);
                todo.save(null, {
                    useMasterKey: true,
                    success: function (object) {
                        response.success([todo]);
                    },
                    error: function (object, error) {
                        response.error("Got an error " + error.code + " : " + error.description);
                    }
                });
            } else {
                response.error("ToDo not found to update");
            }

        },
        error: function (error) {
            response.error("- Error: " + error.code + " " + error.message);
        }
    });
});


Parse.Cloud.define('setUsersAcls', function (request, response) {
    var currentUser = request.user;
    currentUser.setACL(new Parse.ACL(currentUser));
    currentUser.save(null, {
        useMasterKey: true,
        success: function (object) {
            response.success("Acls Updated");
        },
        error: function (object, error) {
            response.error("Got an error " + error.code + " : " + error.description);
        }
    });
});

Parse.Cloud.job("markUnfinishedToDosOlderThan1YearAsFinished", function (request, status) {
    var date = new Date();
    var intYear = date.getFullYear() - 1;
    var query = new Parse.Query("ToDo");
    query.equalTo("finished", intYear);
    query.lessThan("createdAt", date);
    query.each(function (todo, err) {
        todo.set("finished", true);
        todo.set("finishedDate", date);
        todo.save(null, {
            useMasterKey: true,
            success: function (object) {
                console.log("1 todo updated " + todo.id);
            },
            error: function (object, error) {
                console.log("getNewStore - Error: " + error.code + " " + error.message);
                status.error("getNewStore - Error: " + error.code + " " + error.message);
            }
        });
    }, {useMasterKey: true}).then(function () {
        console.log("Migration completed successfully.");
        status.success("Migration completed successfully.");
    }, function (error) {
        // Set the job's error status
        console.log("getNewStore - Error: " + error.code + " " + error.message);
        status.error("getNewStore - Error: " + error.code + " " + error.message);
    });
});


