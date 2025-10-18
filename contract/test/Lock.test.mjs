import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import hre from "hardhat";

describe("Lock", () => {
  let connection;
  let lock;
  let unlockTime;
  let owner;
  let otherAccount;

  beforeEach(async () => {
    // Connect to Hardhat network
    connection = await hre.network.connect();

    // Get signers
    [owner, otherAccount] = await connection.ethers.getSigners();

    // Set unlock time to 1 year from now
    const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
    const currentTime = Math.floor(Date.now() / 1000);
    unlockTime = currentTime + ONE_YEAR_IN_SECS;

    // Deploy contract
    const ONE_GWEI = 1_000_000_000n;
    const Lock = await connection.ethers.getContractFactory("Lock");
    lock = await Lock.deploy(unlockTime, { value: ONE_GWEI });
  });

  describe("Deployment", () => {
    it("should set the right unlockTime", async () => {
      const contractUnlockTime = await lock.unlockTime();
      assert.equal(contractUnlockTime, BigInt(unlockTime));
    });

    it("should set the right owner", async () => {
      const contractOwner = await lock.owner();
      assert.equal(contractOwner, owner.address);
    });

    it("should receive and store the funds", async () => {
      const contractBalance = await connection.provider.getBalance(
        await lock.getAddress()
      );
      assert.equal(contractBalance, 1_000_000_000n);
    });

    it("should fail if unlockTime is not in the future", async () => {
      const latestTime = Math.floor(Date.now() / 1000);
      const Lock = await connection.ethers.getContractFactory("Lock");

      try {
        await Lock.deploy(latestTime, { value: 1 });
        assert.fail("Expected deployment to fail");
      } catch (error) {
        assert.ok(error.message.includes("Unlock time should be in the future"));
      }
    });
  });

  describe("Withdrawals", () => {
    it("should revert with the right error if called too soon", async () => {
      try {
        await lock.withdraw();
        assert.fail("Expected withdraw to fail");
      } catch (error) {
        assert.ok(error.message.includes("You can't withdraw yet"));
      }
    });

    it("should revert with the right error if called from another account", async () => {
      // Increase time to unlock
      await connection.networkHelpers.time.increase(365 * 24 * 60 * 60);

      try {
        await lock.connect(otherAccount).withdraw();
        assert.fail("Expected withdraw to fail");
      } catch (error) {
        assert.ok(error.message.includes("You aren't the owner"));
      }
    });

    it("should transfer the funds to the owner", async () => {
      // Increase time to unlock
      await connection.networkHelpers.time.increase(365 * 24 * 60 * 60);

      const ownerBalanceBefore = await connection.provider.getBalance(owner.address);
      const tx = await lock.withdraw();
      const receipt = await tx.wait();

      const ownerBalanceAfter = await connection.provider.getBalance(owner.address);
      const gasCost = receipt.gasUsed * receipt.gasPrice;

      // Owner should receive the locked amount minus gas costs
      assert.ok(ownerBalanceAfter > ownerBalanceBefore - gasCost);
    });
  });
});
