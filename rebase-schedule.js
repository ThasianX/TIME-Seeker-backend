const cron = require("node-cron");
const { addNewEntry, getAllUsers } = require("./redis");
const { getAccountInfo } = require("./account-info");
const { HTTP_STATUS } = require("./http-status");

const startRebaseEntryScheduling = () => {
    cron.schedule("30 0 1,9,17 * * *", setForAll, {
        scheduled: true,
        timezone: "America/New_York",
    });
};

const setForAll = async () => {
    const users = await getAllUsers();
    const timestamp = new Date().getTime();

    for (const user of users) {
        getAccountInfo(user).then((response) => {
            if (response.status === HTTP_STATUS.OK) {
                addNewEntry(user, {
                    timestamp,
                    data: response.data,
                });
            }
        });
    }
};

module.exports = {
    startRebaseEntryScheduling,
};
