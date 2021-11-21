const redis = require("redis");
const client = redis.createClient();

const USERS_SET_ID = "users";
const makeUserHistoryId = (user) => user + "-history";

const connect = async () => {
    await client.connect();
};

const hasUser = async (user) => {
    return await client.sIsMember(USERS_SET_ID, user);
};

const addNewEntry = async (user, timestamp, value) => {
    const historyId = makeUserHistoryId(user);

    const newEntry = {
        timestamp,
        value,
    };
    await client.rPush(historyId, JSON.stringify(newEntry));
};

const addNewUser = async (user, timestamp, value) => {
    await client.sAdd(USERS_SET_ID, user);
    await addNewEntry(user, timestamp, value);
};

const getAllUsers = async () => {
    const users = await client.sMembers(USERS_SET_ID);
    return users;
};

const getUserHistory = async (user) => {
    const historyId = makeUserHistoryId(user);
    const history = await client.lRange(historyId, 0, -1);
    return history.map((d) => JSON.parse(d));
};

module.exports = {
    connect,
    hasUser,
    addNewEntry,
    addNewUser,
    getUserHistory,
    getAllUsers,
};
