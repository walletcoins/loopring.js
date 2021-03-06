/*

  Copyright 2017 Loopring Project Ltd (Loopring Foundation).

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.

*/

const axios = require('axios');
const crypto = require('crypto');
const Validator = require('./validator.js');
const Wallet = require('./wallet.js');
const ethUtil = require('ethereumjs-util');
const signer = require('./signer.js');
const Ajv = require('ajv');
const BigNumber = require('bignumber.js');

function relay (host)
{
    const transactionSchema = {
        'title': 'Transaction',
        'type': 'object',
        'properties': {
            'nonce': {
                'type': 'string',
                'pattern': '^0x[0-9a-fA-F]{1,64}$'
            },
            'gasPrice': {
                'type': 'string',
                'pattern': '^0x[0-9a-fA-F]{1,64}$'
            },
            'gasLimit': {
                'type': 'string',
                'pattern': '^0x[0-9a-fA-F]{1,64}$'
            },
            'to': {
                'type': 'string',
                'pattern': '^0x[0-9a-fA-F]{1,64}$'
            },
            'value': {
                'type': 'string',
                'pattern': '^0x[0-9a-fA-F]{1,64}$'
            },
            'data': {
                'type': 'string',
                'pattern': '^0x[0-9a-fA-F]{8}([0-9a-fA-F]{64})*$|^0x$'
            },
            'chainId': {
                'type': 'integer',
                'minimum': 1
            }
        },
        'required': ['gasPrice', 'gasLimit', 'to', 'value', 'data']
    };

    const request = { 'jsonrpc': '2.0' };
    const validataor = new Validator();
    const ajv = new Ajv();
    this.getTransactionCount = async (add, tag) =>
    {
        if (!validataor.isValidETHAddress(add))
        {
            throw new Error('invalid ETH address');
        }

        if (!tag)
        {
            tag = 'latest';
        }

        if (tag !== 'latest' && tag !== 'earliest' && tag !== 'pending')
        {
            throw new Error('invalid  tag:' + tag);
        }

        const params = [add, tag];
        request.id = id();
        request.method = 'eth_getTransactionCount';
        request.params = params;

        return axios({
            url: host,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            data: request
        }).then(res => res.data).then(res =>
        {
            if (res.error)
            {
                throw new Error(res.error.message);
            }
            return res.result;
        });
    };

    this.getAccountBalance = async (add, tag) =>
    {
        if (!validataor.isValidETHAddress(add))
        {
            throw new Error('invalid ETH address');
        }

        if (!tag)
        {
            tag = 'latest';
        }
        if (tag !== 'latest' && tag !== 'earliest' && tag !== 'pending')
        {
            throw new Error('invalid  tag:' + tag);
        }

        const params = [add, tag];
        request.id = id();
        request.method = 'eth_getBalance';
        request.params = params;

        return axios({
            url: host,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            data: request
        }).then(res => res.data).then(res =>
        {
            if (res.error)
            {
                throw new Error(res.error.message);
            }
            return new BigNumber(validHex(res.result));
        });
    };

    this.call = async (data, tag) =>
    {
        if (!tag)
        {
            tag = 'latest';
        }
        if (tag !== 'latest' && tag !== 'earliest' && tag !== 'pending')
        {
            throw new Error('invalid  tag:' + tag);
        }

        request.method = 'eth_call';
        request.params = [data, tag];
        request.id = id();

        return axios({
            url: host,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            data: request
        }).then(res => res.data).then(res =>
        {
            if (res.error)
            {
                throw new Error(res.error.message);
            }
            return validHex(res.result);
        });
    };

    this.generateTx = async (rawTx, privateKey) =>
    {
        const wallet = new Wallet();
        wallet.setPrivateKey(ethUtil.toBuffer(privateKey));

        const validResult = ajv.validate(transactionSchema, rawTx);

        if (validResult.error)
        {
            throw new Error('invalid Tx data ');
        }

        const gasLimit = new BigNumber(Number(rawTx.gasLimit));

        if (gasLimit.lessThan(21000))
        {
            throw new Error('gasLimit must be greater than 21000');
        }

        if (gasLimit.greaterThan(5000000))
        {
            throw new Error('gasLimit is too big');
        }

        const balance = await this.getAccountBalance(wallet.getAddress());

        const needBalance = new BigNumber(rawTx.value).add(gasLimit * new BigNumber(rawTx.gasPrice));

        if (balance.lessThan(needBalance))
        {
            throw new Error('Balance  is not enough');
        }

        const nonce = await this.getTransactionCount(wallet.getAddress());

        rawTx.nonce = rawTx.nonce || nonce;
        rawTx.chainId = rawTx.chainId || 1;

        const signed = signer.signEthTx(rawTx, privateKey);
        return {
            tx: rawTx,
            signedTx: signed
        };
    };

    this.sendSignedTx = async (tx) =>
    {
        request.id = id();
        request.method = 'eth_sendRawTransaction';
        request.params = [tx];

        return axios({
            url: host,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },

            data: request
        }).then(res => res.data).then(res =>
        {
            if (res.error)
            {
                throw new Error(res.error.message);
            }
            return res.result;
        });
    };

    this.getTokenBalance = async (token, add, tag) =>
    {
        if (!validataor.isValidETHAddress(add))
        {
            throw new Error('invalid ETH address' + add);
        }

        if (!validataor.isValidETHAddress(token))
        {
            throw new Error('invalid token contract Address ' + token);
        }
        const data = signer.generateBalanceOfData(add);

        const params = {
            to: token,
            data
        };

        if (!tag)
        {
            tag = 'latest';
        }

        if (tag !== 'latest' && tag !== 'earliest' && tag !== 'pending')
        {
            throw new Error('invalid  tag:' + tag);
        }
        return new BigNumber(await this.call(params, tag));
    };

    this.getCutOff = async (add, contractVersion, tag) =>
    {
        if (!validataor.isValidETHAddress(add))
        {
            throw new Error('invalid ETH address' + add);
        }
        tag = tag || 'latest';
        if (tag !== 'latest' && tag !== 'earliest' && tag !== 'pending')
        {
            throw new Error('invalid  tag:' + tag);
        }
        request.id = id();
        request.method = 'loopring_getCutoff';
        request.params = [add, contractVersion];

        return axios({
            url: host,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            data: request
        }).then(r => r.data).then(res =>
        {
            return res;
        });
    };
    this.getTokenAllowance = async (token, owner, spender, tag) =>
    {
        if (!validataor.isValidETHAddress(owner))
        {
            throw new Error('invalid owner address');
        }

        if (!validataor.isValidETHAddress(spender))
        {
            throw new Error('invalid spender address');
        }

        if (!validataor.isValidETHAddress(token))
        {
            throw new Error('invalid token Contract Address');
        }

        const data = signer.generateAllowanceData(owner, spender);
        const params = {
            to: token,
            data
        };

        if (!tag)
        {
            tag = 'latest';
        }

        if (tag !== 'latest' && tag !== 'earliest' && tag !== 'pending')
        {
            throw new Error('invalid  tag:' + tag);
        }

        return new BigNumber(await this.call(params, tag));
    };

    this.submitLoopringOrder = async (order) =>
    {
        request.method = 'loopring_submitOrder';
        request.params = [order];
        request.id = id();

        return axios({
            url: host,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            data: request
        }).then(r => r.data).then(res =>
        {
            return res;
        });
    };

    this.cancelLoopringOrder = async (rawTX, privateKey) =>
    {
        const tx = await this.generateTx(rawTX, privateKey);
        return this.sendSignedTx(tx.signedTx);
    };

    this.getOrders = async (filter) =>
    {
        request.method = 'loopring_getOrders';
        request.params = [filter];
        request.id = id();

        return axios({
            url: host,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            data: request
        }).then(r => r.data).then(res =>
        {
            return res;
        });
    };

    this.getDepth = async (filter) =>
    {
        request.method = 'loopring_getDepth';
        request.params = [ filter ];
        request.id = id();

        return axios({
            url: host,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            data: request
        }).then(r => r.data).then(res =>
        {
            return res;
        });
    };

    this.getTicker = async (market) =>
    {
        request.method = 'loopring_getTicker';
        request.params = [market];
        request.id = id();

        return axios({
            url: host,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            data: request
        }).then(r => r.data).then(res =>
        {
            return res;
        });
    };

    this.getFills = async (filter) =>
    {
        // filter:market, address, pageIndex, pageSize,contractVersion
        request.method = 'loopring_getFills';
        request.params = [filter];
        request.id = id();

        return axios({
            url: host,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            data: request
        }).then(r => r.data).then(res =>
        {
            return res;
        });
    };

    this.getTrend = async (market) =>
    {
        // filter:market
        request.method = 'loopring_getTrend';
        request.params = [market];
        request.id = id();

        return axios({
            url: host,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            data: request
        }).then(r => r.data).then(res =>
        {
            return res;
        });
    };

    this.getRingMined = async (filter) =>
    {
        // filter:ringHash, orderHash, miner, pageIndex, pageSize,contractVersion
        request.method = 'loopring_getRingMined';
        request.params = [filter];
        request.id = id();

        return axios({
            url: host,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            data: request
        }).then(r => r.data).then(res =>
        {
            return res;
        });
    };

    this.getBalances = async (owner, contractVersion) =>
    {
        request.method = 'loopring_getBalance';
        request.params = [{owner, contractVersion}];
        request.id = id();

        return axios({
            url: host,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            data: request
        }).then(r => r.data).then(res =>
        {
            return res;
        });
    };

    this.getPriceQuote = async (currency) =>
    {
        request.method = 'loopring_getPriceQuote';
        request.params = [currency];
        request.id = id();

        return axios({
            url: host,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            data: request
        }).then(r => r.data).then(res =>
        {
            return res;
        });
    };

    this.getEstimatedAllocatedAllowance = async (owner, token) =>
    {
        request.method = 'loopring_getEstimatedAllocatedAllowance';
        request.params = [owner, token];
        request.id = id();

        return axios({
            url: host,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            data: request
        }).then(r => r.data).then(res =>
        {
            return res;
        });
    };
    const id = () =>
    {
        return crypto.randomBytes(16).toString('hex');
    };

    const validHex = (data) =>
    {
        if (data === '0x')
        {
            data = '0x0';
        }
        return data;
    };
}

module.exports = relay;
