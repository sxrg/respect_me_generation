import React, { Component } from "react";
import "../routes/Resources.css";
import AdminUploadResource from "../components/AdminUploadResource";
import { withRouter } from "react-router-dom";
import fire from "../fire.js";
import ResourceEntryCard from "../components/ResourceEntryCard";

const dbRef = fire.database().ref();

class Resources extends Component {
  tags = ["all", "study", "health", "relationship"];

  state = {
    isLoading: true,
    tag: "all",
    entries: [],
    userUID: null,
  };

  componentDidMount() {
    // may need to flatten database
    this.getResources("study");
    this.getResources("health");
    this.getResources("relationships");
    this.getUserUID();
  }

  /**
   * Get current user ID
   */
  getUserUID = () => {
    fire.auth().onAuthStateChanged((user) => {
      if (user) {
        this.setState({
          userUID: user.uid,
        });
      }
    });
  };

  /**
   * Grab resources from database.
   */
  getResources = (tag) => {
    // read all resources from db
    dbRef
      .child("Resources")
      .child(tag)
      .once("value")
      .then(function (snap) {
        const result = snap.val();
        // console.log(result);
        return result;
      })
      .then((res) => {
        this.parseResource(res);
      })
      .catch((err) => {
        console.log(err);
      });
  };

  /**
   * Parse the objects from firebase into entries.
   *
   * @param {Object}
   * @param {String} resourceType the tag prop
   */
  parseResource(resourceObj) {
    const parsed = Object.keys(resourceObj).map((key) => {
      resourceObj[key]["key"] = key;
      return resourceObj[key];
    });

    this.setState({ entries: [...this.state.entries, ...parsed] });
  }

  render() {
    return (
      <div className="resources_wrapper">
        <h2>RESOURCES</h2>
        <div className="resource_row">
          {this.state.entries
            ? this.state.entries.map((item, index) => (
                <ResourceEntryCard key={index} item={item} userUID={this.state.userUID} />
              ))
            : null}
        </div>
        <AdminUploadResource />
      </div>
    );
  }
}

export default withRouter(Resources);
