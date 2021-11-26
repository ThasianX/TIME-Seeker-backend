const axios = require("axios");
const { HTTP_STATUS } = require("./http-status");

const getAccountInfo = async (accountPubKey) => {
    const wonderlandResp = await loadWonderland(accountPubKey);
    const abracadabraResp = await loadAbracadabra(accountPubKey);

    const stakedAccountAssets =
        wonderlandResp.status === HTTP_STATUS.OK
            ? await loadAccountAssets(wonderlandResp.data)
            : [];
    const leveragedAccountAssets =
        abracadabraResp.status === HTTP_STATUS.OK
            ? await loadAccountAssets(abracadabraResp.data)
            : [];

    if (
        stakedAccountAssets.length !== 0 ||
        leveragedAccountAssets.length !== 0
    ) {
        const stakedBalanceUSD = getNetWorth(stakedAccountAssets);
        const leveragedBalanceUSD = getNetWorth(leveragedAccountAssets);

        return {
            status: HTTP_STATUS.OK,
            data: {
                staked: {
                    assets: stakedAccountAssets,
                    balanceUSD: stakedBalanceUSD,
                },
                leveraged: {
                    assets: leveragedAccountAssets,
                    balanceUSD: leveragedBalanceUSD,
                },
                totalBalanceUSD: stakedBalanceUSD + leveragedBalanceUSD,
            },
        };
    } else {
        return {
            status: wonderlandResp.status,
            message: wonderlandResp.message,
        };
    }
};

const WONDER_BASE_URL =
    "https://api.zapper.fi/v1/protocols/wonderland/balances?network=avalanche&api_key=96e0cc51-a62e-42ca-acee-910ea7d2a241&newBalances=true";

const loadWonderland = async (accountPubKey) => {
    const url = WONDER_BASE_URL + "&addresses%5B%5D=" + accountPubKey;

    try {
        const { data } = await axios.get(url.toString());

        const product = data[accountPubKey].products.find((product) => {
            return product.label === "Wonderland";
        });

        if (product === undefined || product?.assets?.length === 0) {
            return {
                status: HTTP_STATUS.NOT_FOUND,
                message: "Account does not hold Wonderland assets",
            };
        }

        const assets = product.assets.filter(
            (asset) => asset.appId === "wonderland"
        );

        if (assets.length === 0) {
            return {
                status: HTTP_STATUS.NOT_FOUND,
                message: "Account does not hold Wonderland assets",
            };
        }

        return {
            status: HTTP_STATUS.OK,
            data: assets,
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

const VALID_SYMBOLS = ["wMEMO", "MEMO", "TIME"];

const ABRA_BASE_URL =
    "https://api.zapper.fi/v1/protocols/abracadabra/balances?network=avalanche&api_key=96e0cc51-a62e-42ca-acee-910ea7d2a241&newBalances=true";

const loadAbracadabra = async (accountPubKey) => {
    const url = ABRA_BASE_URL + "&addresses%5B%5D=" + accountPubKey;

    try {
        const { data } = await axios.get(url.toString());

        const product = data[accountPubKey].products.find((product) => {
            return product.label === "Abracadabra";
        });

        if (product === undefined || product?.assets?.length === 0) {
            return {
                status: HTTP_STATUS.NOT_FOUND,
                message: "Account does not hold Wonderland assets",
            };
        }

        const assets = product.assets.reduce((acc, asset) => {
            if (
                asset.appId !== "abracadabra" ||
                asset.type !== "leveraged-position"
            ) {
                return acc;
            }
            return [...acc, asset];
        }, []);

        if (assets.length === 0) {
            return {
                status: HTTP_STATUS.NOT_FOUND,
                message: "Account does not hold Wonderland assets",
            };
        }

        return {
            status: HTTP_STATUS.OK,
            data: assets,
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

const loadAccountAssets = async (assets) => {
    const accountAssets = assets.reduce((acc, asset) => {
        return [
            ...acc,
            ...asset.tokens.reduce((_acc, asset) => {
                if (!VALID_SYMBOLS.includes(asset.symbol)) {
                    return _acc;
                }

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

                return [..._acc, iAsset];
            }, []),
        ];
    }, []);

    return accountAssets;
};

const getNetWorth = (assets) => {
    return assets.reduce((acc, { balance, price }) => {
        return acc + balance * price;
    }, 0);
};

module.exports = {
    getAccountInfo,
};
