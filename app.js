const express = require("express");
const { validationResult, query } = require("express-validator");
const axios = require("axios");

const app = express();
const port = 3000;

app.get("/user", query("accountPubKey").isString(), async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { accountPubKey } = req.query;
    const assets = await loadAccountAssets(accountPubKey);
    res.send(assets);
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});

const BASE_URL =
    "https://api.zapper.fi/v1/protocols/wonderland/balances?network=avalanche&api_key=96e0cc51-a62e-42ca-acee-910ea7d2a241";

const loadAccountAssets = async (accountPubKey) => {
    const url = BASE_URL + "&addresses%5B%5D=" + accountPubKey;
    const { data } = await axios.get(url.toString());

    const responseAssets = data[accountPubKey].products.find((product) => {
        return product.label === "Wonderland";
    }).assets;

    const assets = responseAssets.reduce((acc, asset) => {
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

    return assets;
};

const getNetWorth = (assets) => {
    return assets.reduce((acc, asset) => {
        return acc + asset.balance * asset.price;
    }, 0);
};
