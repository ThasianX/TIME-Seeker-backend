const express = require("express");
const {
    hasUser,
    addNewUser,
    getUserHistory,
    getAllUsers,
    connectDatabase,
    deleteAllUsers,
    deleteUser,
} = require("./redis");
const { getAccountInfo } = require("./account-info");
const { HTTP_STATUS } = require("./http-status");
const { startRebaseEntryScheduling } = require("./rebase-schedule");

const app = express();
const hostname = "127.0.0.1";
const port = 3001;

app.get("/users", async (_, res) => {
    const users = await getAllUsers();
    return res.send(users);
});

app.get("/user/assets", async (req, res) => {
    const accountPubKey = getAccountPubKey(req);

    const response = await getAccountInfo(accountPubKey);

    if (response.status === HTTP_STATUS.OK) {
        res.send(response.data);
    } else {
        res.status(response.status).send({
            error: response.message,
        });
    }
});

app.get("/user/history", async (req, res) => {
    const accountPubKey = getAccountPubKey(req);

    const userExists = await hasUser(accountPubKey);
    if (!userExists) {
        return res
            .status(HTTP_STATUS.BAD_REQUEST)
            .send({ error: "User does not exist" });
    }

    const history = await getUserHistory(accountPubKey);
    res.send(history);
});

app.post("/users", async (req, res) => {
    const accountPubKey = getAccountPubKey(req);

    const response = await getAccountInfo(accountPubKey);

    if (response.status === HTTP_STATUS.OK) {
        const userExists = await hasUser(accountPubKey);
        if (!userExists) {
            await addNewUser(accountPubKey, {
                timestamp: new Date().getTime(),
                data: response.data,
            });
        }
        res.send(response.data);
    } else {
        res.status(response.status).send({
            error: response.message,
        });
    }
});

app.post("/users/delete", async (req, res) => {
    const accountPubKey = getAccountPubKey(req);

    if (accountPubKey === undefined) {
        await deleteAllUsers();
    } else {
        await deleteUser(accountPubKey);
    }
    res.status(HTTP_STATUS.OK).send();
});

app.listen(port, () => {
    connectDatabase();
    startRebaseEntryScheduling();
    console.log(`Server running at http://${hostname}:${port}/`);
});

const getAccountPubKey = (req) => {
    return req.query.accountPubKey?.toLowerCase();
};
