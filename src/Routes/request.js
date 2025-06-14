const express = require("express");
const requestRouter = express.Router();
const { userAuth } = require("../middlewares/auth");
const ConnectionRequestModel = require("../models/connectionRequest");
const UserModel = require("../models/user");

requestRouter.post(
  "/sendConnectionRequest/:status/:userId",
  userAuth,
  async (req, res) => {
    const user = req.user;
    const toUserId = req.params.userId;
    const fromUserId = user._id;

    try {
      // checking if request already exists
      const existingRequest = await ConnectionRequestModel.findOne({
        $or: [
          {
            fromUserId,
            toUserId,
          },
          {
            fromUserId: toUserId,
            toUserId: fromUserId,
          },
        ],
      });
      if (existingRequest) {
        return res.status(400).json({ message: "Request already sent" });
      }
      //cheacking if the toUserId exists
      const toUser = await UserModel.findById(toUserId);
      if (!toUser) {
        res.send("User not found");
      }
      // checking if user is trying to send request to themselves
      if (fromUserId.toString() === toUserId.toString()) {
        return res
          .status(400)
          .json({ message: "You cannot send a request to yourself" });
      }
      const newRequest = new ConnectionRequestModel({
        fromUserId,
        toUserId,
        status: req.params.status,
      }).save();
      res.send({
        message: "Connection request sent successfully",
        request: newRequest,
      });
    } catch (error) {
      console.error("Error sending connection request:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

requestRouter.post(
  "/request/review/:status/:requestId",
  userAuth,
  async (req, res) => {
    try {
      const loggedInUser = req.user;
      const { status, requestId } = req.params;
      const allowedStatus = ["accepted", "rejected"];
      if (!allowedStatus.includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const connectionRequest = await ConnectionRequestModel.findOne({
        _id: requestId,
        toUserId: loggedInUser._id,
        status: "interested",
      });
      if (!connectionRequest) {
        return res.status(404).json({ message: "Request not found" });
      }

      connectionRequest.status = status;
      const data = await connectionRequest.save();

      res.json({
        message: `Connection request ${status} successfully`,
        data,
      });
    } catch (error) {
      // console.error("Error reviewing connection request:", error);
      res.status(400).json("error: " + error.message);
    }
  }
);

module.exports = requestRouter;
