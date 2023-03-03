const { ethers } = require("hardhat");
const { expect } = require("chai");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { parseUnits, parseEther } = ethers.utils;
const zeroAddress = ethers.constants.AddressZero;

describe("Odeum interacting with Staking and Tipping", () => {

    // Deploy all contracts before each test suite
    async function deploys() {
        [
            ownerAcc,
            clientAcc1,
            clientAcc2,
            clientAcc3,
            clientAcc4,
            burnAcc,
            teamAcc
        ] = await ethers.getSigners();

        let odeumTx = await ethers.getContractFactory("Odeum");
        let odeum = await upgrades.deployProxy(odeumTx, [ownerAcc.address], {
            initializer: "configure",
            kind: "uups",
        });
        await odeum.deployed();

        let stakingTx = await ethers.getContractFactory("StakingPool");
        let stakingProto = await stakingTx.deploy(odeum.address);
        let staking = await stakingProto.deployed();

        let tippingTx = await ethers.getContractFactory("Tipping");
        let tippingProto = await tippingTx.deploy(
            staking.address,
            odeum.address,
            ownerAcc.address,
            // TODO should it be any other address???
            zeroAddress,
            10,
            45,
            45
        );
        let tipping = await tippingProto.deployed();



        // After odeum was deployed, 100_000_000 tokens were minter to owner.
        // We need to transfer them to test accounts as well

        await odeum.connect(ownerAcc).approve(clientAcc1.address, parseEther("10000"))
        await odeum.connect(ownerAcc).transfer(clientAcc1.address, parseEther("10000"))

        await odeum.connect(ownerAcc).approve(clientAcc2.address, parseEther("50000"))
        await odeum.connect(ownerAcc).transfer(clientAcc2.address, parseEther("50000"))

        await odeum.connect(ownerAcc).approve(clientAcc3.address, parseEther("100000"))
        await odeum.connect(ownerAcc).transfer(clientAcc3.address, parseEther("100000"))

        await odeum.connect(ownerAcc).approve(clientAcc4.address, parseEther("100000"))
        await odeum.connect(ownerAcc).transfer(clientAcc4.address, parseEther("100000"))

        return {
            odeum,
            staking,
            tipping
        };
    }

    describe("Interactions", () => {

        // #1
        it("Users should be able to stake their tokens into the staking contract.", async () => {
            let { odeum, staking, tipping } = await loadFixture(
                deploys
            );

            let stake1 = parseEther("10000");
            let stake2 = parseEther("25000");
            let stake3 = parseEther("50000");

            let startBalance1 = await odeum.balanceOf(clientAcc1.address);
            let startBalance2 = await odeum.balanceOf(clientAcc2.address);
            let startBalance3 = await odeum.balanceOf(clientAcc3.address);

            await odeum.connect(clientAcc1).approve(staking.address, stake1);
            await odeum.connect(clientAcc2).approve(staking.address, stake2);
            await odeum.connect(clientAcc3).approve(staking.address, stake3);

            await staking.connect(clientAcc1).deposit(stake1);
            await staking.connect(clientAcc2).deposit(stake2);
            await staking.connect(clientAcc3).deposit(stake3);

            let amount1 = (await staking.userInfo(clientAcc1.address)).amount;
            let amount2 = (await staking.userInfo(clientAcc2.address)).amount;
            let amount3 = (await staking.userInfo(clientAcc3.address)).amount;
            expect(amount1).to.equal(stake1);
            expect(amount2).to.equal(stake2);
            expect(amount3).to.equal(stake3);

            let endBalance1 = await odeum.balanceOf(clientAcc1.address);
            let endBalance2 = await odeum.balanceOf(clientAcc2.address);
            let endBalance3 = await odeum.balanceOf(clientAcc3.address);

            expect(startBalance1.sub(endBalance1)).to.equal(stake1);
            expect(startBalance2.sub(endBalance2)).to.equal(stake2);
            expect(startBalance3.sub(endBalance3)).to.equal(stake3);
        });


        // #2
        it("Users should be able to withdraw their tokens after stake", async () => {
            let { odeum, staking, tipping } = await loadFixture(
                deploys
            );

            let startBalance1 = await odeum.balanceOf(clientAcc1.address);
            let startBalance2 = await odeum.balanceOf(clientAcc2.address);
            let startBalance3 = await odeum.balanceOf(clientAcc3.address);

            let stake1 = parseEther("10000");
            let stake2 = parseEther("25000");
            let stake3 = parseEther("50000");

            await odeum.connect(clientAcc1).approve(staking.address, stake1);
            await odeum.connect(clientAcc2).approve(staking.address, stake2);
            await odeum.connect(clientAcc3).approve(staking.address, stake3);

            await staking.connect(clientAcc1).deposit(stake1);
            await staking.connect(clientAcc2).deposit(stake2);
            await staking.connect(clientAcc3).deposit(stake3);

            await staking.connect(clientAcc1).withdraw(stake1);
            await staking.connect(clientAcc2).withdraw(stake2);
            await staking.connect(clientAcc3).withdraw(stake3);

            let amount1 = (await staking.userInfo(clientAcc1.address)).amount;
            let amount2 = (await staking.userInfo(clientAcc2.address)).amount;
            let amount3 = (await staking.userInfo(clientAcc3.address)).amount;
            expect(amount1).to.equal(0);
            expect(amount2).to.equal(0);
            expect(amount3).to.equal(0);

            let endBalance1 = await odeum.balanceOf(clientAcc1.address);
            let endBalance2 = await odeum.balanceOf(clientAcc2.address);
            let endBalance3 = await odeum.balanceOf(clientAcc3.address);

            expect(startBalance1).to.equal(endBalance1);
            expect(startBalance2).to.equal(endBalance2);
            expect(startBalance3).to.equal(endBalance3);

        });

        // #3
        it("There should be a method to expose the total stake amount", async () => {
            let { odeum, staking, tipping } = await loadFixture(
                deploys
            );

            let startBalance1 = await odeum.balanceOf(clientAcc1.address);
            let startBalance2 = await odeum.balanceOf(clientAcc2.address);
            let startBalance3 = await odeum.balanceOf(clientAcc3.address);

            let stake1 = parseEther("10000");
            let stake2 = parseEther("25000");
            let stake3 = parseEther("50000");

            await odeum.connect(clientAcc1).approve(staking.address, stake1);
            await odeum.connect(clientAcc2).approve(staking.address, stake2);
            await odeum.connect(clientAcc3).approve(staking.address, stake3);

            await staking.connect(clientAcc1).deposit(stake1);
            await staking.connect(clientAcc2).deposit(stake2);
            await staking.connect(clientAcc3).deposit(stake3);

            expect(await staking.totalStake()).to.equal(parseEther("85000"));

        });

        // #5
        it("Users should be able to send a tip and have it split", async () => {
            let { odeum, staking, tipping } = await loadFixture(
                deploys
            );

            let senderBalance1 = await odeum.balanceOf(clientAcc1.address);
            let receiverBalance1 = await odeum.balanceOf(clientAcc2.address);
            let teamBalance1 = await odeum.balanceOf(ownerAcc.address);
            let stakingBalance1 = await odeum.balanceOf(staking.address);
            let zeroAddressBalance1 = await odeum.balanceOf(zeroAddress);

            let tip = parseEther("10000");

            await odeum.connect(clientAcc1).approve(tipping.address, tip);

            await tipping.connect(clientAcc1).transfer(clientAcc2.address, tip);

            let senderBalance2 = await odeum.balanceOf(clientAcc1.address);
            let receiverBalance2 = await odeum.balanceOf(clientAcc2.address);
            let teamBalance2 = await odeum.balanceOf(ownerAcc.address);
            let stakingBalance2 = await odeum.balanceOf(staking.address);
            let zeroAddressBalance2 = await odeum.balanceOf(zeroAddress);

            expect(senderBalance1).sub(senderBalance2).to.equal(tip);
            expect(receiverBalance2).sub(receiverBalance1).to.equal(tip.mul(0.9));
            expect(teamBalance2).sub(teamBalance1).to.equal(tip.mul(0.045));
            expect(stakingBalance2).sub(stakingBalance1).to.equal(tip.mul(0.045));
            expect(zeroAddressBalance2).sub(zeroAddressBalance1).to.equal(tip.mul(0.01));

        });

        // #6
        it("Users should be able to see how many tokens the have received as rewards from staking and tipping", async () => {
            let { odeum, staking, tipping } = await loadFixture(
                deploys
            );

            let stake = parseEther("10000");

            await odeum.connect(clientAcc1).approve(staking.address, stake);

            await staking.connect(clientAcc1).deposit(stake);

            expect(await staking.connect(clientAcc1).availableReward()).to.equal(0);

            // TODO what does `reward` mean in Tipping?

        });


        // TODO add #7 here

        // #8
        it("Tips should be split proportionally to stakes", async () => {
            let { odeum, staking, tipping } = await loadFixture(
                deploys
            );

            let stake1 = parseEther("1000");
            let stake2 = parseEther("2000");

            await odeum.connect(clientAcc1).approve(staking.address, stake1);
            await odeum.connect(clientAcc2).approve(staking.address, stake2);

            await staking.connect(clientAcc1).deposit(stake1);
            await staking.connect(clientAcc2).deposit(stake2);

            let startBalance1 = await odeum.balanceOf(clientAcc1.address);
            let startBalance2 = await odeum.balanceOf(clientAcc2.address);

            let tip = parseEther("10000");

            await odeum.connect(clientAcc3).approve(tipping.address, tip);
            await tipping.connect(clientAcc3).transfer(clientAcc4.address, tip);

            let endBalance1 = await odeum.balanceOf(clientAcc1.address);
            let endBalance2 = await odeum.balanceOf(clientAcc2.address);

            expect(endBalance1.sub(startBalance1)).to.equal(parseEther("150"));
            expect(endBalance2.sub(startBalance2)).to.equal(parseEther("300"));
        });


        // TODO add #9 here

        it("Percentages should be adjustable", async () => {
            let { odeum, staking, tipping } = await loadFixture(
                deploys
            );

            expect(await tipping._burnRate()).to.equal(10);
            expect(await tipping._fundRate()).to.equal(45);
            expect(await tipping._rewardRate()).to.equal(45);

            await tipping.connect(ownerAcc).setBurnRate(15);
            await tipping.connect(ownerAcc).setFundRate(10);
            await tipping.connect(ownerAcc).setRewardRate(10);

            expect(await tipping._burnRate()).to.equal(15);
            expect(await tipping._fundRate()).to.equal(10);
            expect(await tipping._rewardRate()).to.equal(10);

            let stakingBalance1 = await odeum.balanceOf(staking.address);

            let tip = parseEther("10000");

            await odeum.connect(clientAcc1).approve(tipping.address, tip);
            await tipping.connect(clientAcc1).transfer(clientAcc2.address, tip);

            let stakingBalance2 = await odeum.balanceOf(staking.address);
            expect(stakingBalance2.sub(stakingBalance1)).to.equal(parseEther("1000"));
        });

    });

});
