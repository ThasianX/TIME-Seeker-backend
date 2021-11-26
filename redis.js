const redis = require("redis");
const client = redis.createClient();

const USERS_SET_ID = "users";
const makeUserHistoryId = (user) => user + "-history";

const connectDatabase = async () => {
    await client.connect();
};

const hasUser = async (user) => {
    return await client.sIsMember(USERS_SET_ID, user);
};

const deleteUser = async (user) => {
    await client.sRem(USERS_SET_ID, user);
    await client.del(makeUserHistoryId(user));
};

const deleteAllUsers = async () => {
    const users = await getAllUsers();
    for (const user of users) {
        await deleteUser(user);
    }
};

const addNewEntry = async (user, value) => {
    const historyId = makeUserHistoryId(user);

    await client.rPush(historyId, JSON.stringify(value));
};

const addNewUser = async (user, value) => {
    await client.sAdd(USERS_SET_ID, user);
    await addNewEntry(user, value);
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
    connectDatabase,
    hasUser,
    addNewEntry,
    addNewUser,
    getUserHistory,
    getAllUsers,
    deleteUser,
    deleteAllUsers,
};
