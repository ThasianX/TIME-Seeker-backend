const express = require("express");
const axios = require("axios");
const cron = require("node-cron");
const {
    hasUser,
    addNewEntry,
    addNewUser,
    getUserHistory,
    getAllUsers,
    connect,
} = require("./redis");

const app = express();
const hostname = "127.0.0.1";
const port = 3000;

const HTTP_STATUS = {
    OK: 200,
    BAD_REQUEST: 400,
    NOT_FOUND: 404,
};

const getAccountPubKey = (req) => {
    return req.query.accountPubKey.toLowerCase();
};

app.get("/user/assets", async (req, res) => {
    const accountPubKey = getAccountPubKey(req);

    const response = await loadWonderland(accountPubKey);

    if (response.status === HTTP_STATUS.OK) {
        const info = await loadAccountInfo(response.data);
        res.send(info);
    } else {
        res.status(response.status).send({ error: response.message });
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

    const response = await loadWonderland(accountPubKey);

    if (response.status === HTTP_STATUS.OK) {
        const userExists = await hasUser(accountPubKey);
        if (!userExists) {
            const timestamp = new Date().getTime();
            await addNewUser(
                accountPubKey,
                timestamp,
                getNetWorth(response.data)
            );
        }

        const info = await loadAccountInfo(response.data);
        res.send(info);
    } else {
        res.status(response.status).send({ error: response.message });
    }
});

app.listen(port, hostname, () => {
    connect();
    console.log(`Server running at http://${hostname}:${port}/`);
});

const BASE_URL =
    "https://api.zapper.fi/v1/protocols/wonderland/balances?network=avalanche&api_key=96e0cc51-a62e-42ca-acee-910ea7d2a241&newBalances=true";

const loadWonderland = async (accountPubKey) => {
    const url = BASE_URL + "&addresses%5B%5D=" + accountPubKey;

    try {
        const { data } = await axios.get(url.toString());

        const wonderlandProduct = data[accountPubKey].products.find(
            (product) => {
                return product.label === "Wonderland";
            }
        );

        if (
            wonderlandProduct === undefined ||
            wonderlandProduct?.assets?.length === 0
        ) {
            return {
                status: HTTP_STATUS.NOT_FOUND,
                message: "Account does not hold Wonderland assets",
            };
        }

        const wonderlandAsset = wonderlandProduct.assets.find(
            (asset) => asset.appId === "wonderland"
        );

        if (wonderlandAsset === undefined) {
            return {
                status: HTTP_STATUS.NOT_FOUND,
                message: "Account does not hold Wonderland assets",
            };
        }

        return {
            status: HTTP_STATUS.OK,
            data: wonderlandAsset,
        };
    } catch (error) {
        if (error.response) {
            return {
                status: error.response.status,
                message: "Address must be a valid avalanche address",
            };
        } else if (error.request) {
            console.log(error.request);
        } else {
            console.log("Error", error.message);
        }
        const { request, ...errorObject } = response;
        console.log(errorObject);
    }
};

const loadAccountInfo = async (wonderlandAsset) => {
    const assets = wonderlandAsset.tokens.reduce((acc, asset) => {
        const iAsset = {
            token: asset.symbol,
            price: asset.price,
            balance: asset.balance,
            pricePerShare: asset.pricePerShare,
        };

        let currAsset = iAsset;
        let tokens = asset.tokens;
        while (tokens) {
            const baseAsset = tokens[0];
            currAsset.baseAsset = {
                token: baseAsset.symbol,
                price: baseAsset.price,
                balance: baseAsset.balance,
                pricePerShare: baseAsset.pricePerShare,
            };
            currAsset = currAsset.baseAsset;
            tokens = baseAsset.tokens;
        }

        return [...acc, iAsset];
    }, []);

    return {
        assets,
        balanceUSD: getNetWorth(wonderlandAsset),
    };
};

const getNetWorth = (wonderlandAsset) => {
    return wonderlandAsset.balanceUSD;
};

const setForAll = async () => {
    const users = await getAllUsers();
    const timestamp = new Date().getTime();
    for (const user of users) {
        loadWonderland(accountPubKey).then((response) => {
            if (response.status === HTTP_STATUS.OK) {
                const netWorth = getNetWorth(response.data);
                addNewEntry(user, timestamp, netWorth);
            }
        });
    }
};

cron.schedule("30 0 1,9,17 * * *", setForAll, {
    scheduled: true,
    timezone: "America/New_York",
});
