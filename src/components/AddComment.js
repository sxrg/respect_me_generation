import React, { Component } from "react";
import { Modal, Button, Row, Col, Form } from "react-bootstrap";
import Comment from "./Comment";
import fire from "../fire";
import MyCard from "./MyCard";
import { faFlag, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import ReportModal from "./ReportModal";
import "./AddComment.css";
import TextLengthModal from "./TextLengthModal";
import EmptyTextModal from "./EmptyTextModal";
import LoginModal from "./LoginModal";

const dbRef = fire.database();

/**
 * A modal component that opens when a card is clicked.
 * Displays the current card along with comments and upvote/downvote.
 *
 * @param {firebaseUser} cardOwnerUID the firebase user.uid of the selected card
 * @param {string} cardID the unique key each card is stored in the database
 * @param {boolean} show is true when card is clicked and the addComment modal is showing
 * @param {boolean} onHide is true when modal is closed
 */
class AddComment extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loginModal: false, // displays LoginModal.js component when true
      userUID: "", // Google UID of current user
      username: "", // Google display name of current user
      comments: [], // array of comments grabbed from firebase
      newComment: "", // new comment to be added
      reportModal: false, // displays ReportModal.js component when true
      textLengthModal: false, // displays TextLengthModal.js when true
      isValid: false, // becomes true when user can vote
      showVoteError: false, // displays a message that they can't vote when true
      emptyTextModal: false, // displays EmptyTextModal when true
      showTrash: false,
    };
    this.writeComment = this.writeComment.bind(this);
    this.handleInput = this.handleInput.bind(this);
  }

  componentDidMount() {
    fire.auth().onAuthStateChanged((user) => {
      if (user) {
        this.setState({
          username: user.displayName,
          userUID: user.uid,
        });
        this.getUserInfo();
      }
    });
  }

  /**
   * Get user information from firebase and set cards state
   * to a list of selected card owner's cards
   */
  getUserInfo() {
    dbRef
      .ref()
      .child("User")
      .on("value", (snap) => {
        const userInfo = snap.val();
        this.setState({
          cards: userInfo[this.props.cardOwnerUID]["cards"],
        });
        this.getCardDetails();
      });
  }

  /**
   * Save selected card's owner's list of card information
   */
  getCardDetails() {
    let cards = this.state.cards;
    let cardDetails = [];
    for (let card in cards) {
      cardDetails.push({
        id: card,
        comment: cards[card].comments,
        background: cards[card].imgOption,
        text: cards[card].text,
        numComments: this.countComments(cards[card].comments),
      });
    }
    this.setState({
      cards: cardDetails, // re-set cards as an array
      isLoading: false,
    });
  }

  /**
   * Saves new comment to firebase.
   * Text must be less than 35 characters and cannot be empty.
   */
  writeComment() {
    if (this.state.userUID !== "") {
      // if the length of the comment is no more than 35 characters
      if (this.state.newComment.length <= 35 && this.state.newComment.length > 0) {
        dbRef
          .ref("User/" + this.props.cardOwnerUID)
          .child("cards/" + this.props.cardID + "/comments")
          .push({
            comment: this.state.newComment,
            user: this.state.username,
            timestamp: Date.now(),
          });
        this.increasePoints(this.state.userUID);
        this.setState({ newComment: "" });
        // if the comment is an empty text
      } else if (this.state.newComment.length === 0) {
        this.setState({ emptyTextModal: true });
        // if the length of the comment is more than 35 characters
      } else {
        this.setState({ textLengthModal: true });
      }
    } else {
      this.setState({ loginModal: true });
    }
  }

  /**
   * Users gain 5 points when commenting
   * @param {firebaseUser} currentUser the currently logged in user.
   */
  increasePoints(currentUser) {
    dbRef
      .ref("User/" + currentUser)
      .once("value")
      .then(function (snapshot) {
        let points = snapshot.child("points").val();
        points += 5;
        dbRef.ref("User/" + currentUser).update({
          points,
        });
      });
    this.checkBadge(currentUser);
  }

  /**
   * User gets an 'advanced' badge when they reach 100 points
   * @param {firebaseUser} currentUser the currently logged in user.
   */
  checkBadge(currentUser) {
    dbRef
      .ref("User/" + currentUser)
      .once("value")
      .then(function (snapshot) {
        let points = snapshot.child("points").val();
        if (points >= 100) {
          dbRef.ref("User/" + currentUser).update({
            badge: "advanced",
          });
        }
      });
  }

  /**
   * Handles the input comment text on submit.
   * @param {event} event
   */
  handleInput(event) {
    this.setState({
      newComment: event.target.value,
    });
  }

  /**
   * Grabs a list of comments associated with the selected card
   * and displays to the modal
   */
  getComments() {
    let commentDetails = [];
    dbRef
      .ref()
      .child("User")
      .on("value", (snap) => {
        const userInfo = snap.val();
        if (userInfo[this.props.cardOwnerUID] != null) {
          const comments =
            userInfo[this.props.cardOwnerUID]["cards"][this.props.cardID]["comments"];
          for (let comment in comments) {
            commentDetails.push({
              key: comment,
              id: comments[comment].user,
              text: comments[comment].comment,
              timestamp: comments[comment].timestamp,
            });
          }
        }
      });
    return commentDetails.map((comment) => (
      <Comment
        key={comment.key}
        user={comment.id}
        comment={comment.text}
        timestamp={comment.timestamp}
      />
    ));
  }
  /**
   * Displays the card selected
   */
  displayCard() {
    let imgOption;
    let text;
    let numComments;
    dbRef
      .ref()
      .child("User")
      .on("value", (snap) => {
        const userInfo = snap.val();
        if (userInfo[this.props.cardOwnerUID] != null) {
          imgOption = userInfo[this.props.cardOwnerUID]["cards"][this.props.cardID]["imgOption"];
          text = userInfo[this.props.cardOwnerUID]["cards"][this.props.cardID]["text"];
          numComments = this.countComments(
            userInfo[this.props.cardOwnerUID]["cards"][this.props.cardID]["comments"]
          );
        }
      });
    return (
      <MyCard
        key={this.props.cardID}
        id={this.props.cardID}
        background={imgOption}
        text={text}
        commentCount={numComments}
        tag={this.props.tag}
        timestamp={this.props.timestamp}
      />
    );
  }

  /**
   * Displays report modal on button click
   */
  reportClick = () => {
    if (this.state.userUID === "") {
      this.setState({ loginModal: true });
    } else {
      this.setState({ reportModal: true });
    }
  };

  /**
   * Check if user is logged in.
   * @param {firebaseUser} currentUser the currently logged in user.
   */
  verifyUser = (userUID) => {
    if (userUID === "") {
      this.setState({
        isValid: false,
        loginModal: true,
      });
    }
  };

  deleteCard = () => {
    dbRef
      .ref("User/" + this.props.cardOwnerUID)
      .child("cards/" + this.props.cardID)
      .remove();
    this.props.onHide();
    window.location.reload();
  };

  /**
   * Save user uid to prevent second vote from the same user for same card.
   * @param {firebaseUser} cardOwnerUID the firebase user.uid of the selected card
   * @param {string} cardID the unique key each card is stored in the database
   */
  recordUser(cardOwnerUID, cardID) {
    let userUID = this.state.userUID;
    dbRef
      .ref("User/" + cardOwnerUID)
      .child("cards/" + cardID + "/votes")
      .push({
        userUID,
      });
  }

  /**
   * counts the number of comments a user has.
   * @param {Comment} cardCommentObj a card comment object stored in user
   */
  countComments = (cardCommentObj) => {
    // count comments under each card
    let cardComment = cardCommentObj;
    let commentNumber = 0;
    if (cardComment != null) {
      // count and increment commentNumber
      for (let count in cardComment) {
        commentNumber++;
      }
    }
    return commentNumber;
  };

  render() {
    return (
      <div className="add-comment">
        <Modal
          className="add-comment__modal"
          show={this.props.show}
          animation={false}
          onHide={this.props.onHide}
          size="md"
          aria-labelledby="contained-modal-title-vcenter"
          centered
        >
          <Modal.Header className="add-comment__modal__header">
            <Modal.Title className="add-comment__modal__header__title">
              {this.props.cardOwnerUID === this.state.userUID ? (
                <FontAwesomeIcon
                  icon={faTrash}
                  onClick={this.deleteCard}
                  className="lightbulb add-comment__modal__header__title--trash"
                />
              ) : null}

              <span>Comments</span>
              <FontAwesomeIcon
                onClick={this.reportClick}
                className="lightbulb add-comment__modal__header__title--report"
                icon={faFlag}
              />
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="add-comment__modal__body">
            <div>
              <Row>
                <Col className="add-comment__modal__body--card">{this.displayCard()}</Col>
              </Row>
              <Row>
                <Col>{this.getComments()}</Col>
              </Row>
              <br />
              <Form className="add-comment__modal__body__form" onSubmit={this.handleSubmit}>
                <div className="add-comment__modal__body__form__container">
                  <span className="add-comment__modal__body__form__container__input">
                    <Form.Group controlId="Comments">
                      <input
                        type="text"
                        className="add-comment__modal__body__form__container__input--comments"
                        placeholder="add your comment"
                        value={this.state.newComment}
                        onChange={this.handleInput}
                      />
                    </Form.Group>
                  </span>
                  <span className="add-comment__modal__body__form__container__submit">
                    <Form.Group>
                      <Button
                        className="add-comment__modal__body__form__container__submit--button"
                        onClick={this.writeComment}
                      >
                        Add Comment
                      </Button>
                    </Form.Group>
                  </span>
                </div>
              </Form>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={this.props.onHide}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>
        <ReportModal
          show={this.state.reportModal}
          onHide={() => this.setState({ reportModal: false, loginModal: false })}
          cardID={this.props.cardID}
          cardOwnerUID={this.props.cardOwnerUID}
        />
        <TextLengthModal
          show={this.state.textLengthModal}
          onHide={() => this.setState({ textLengthModal: false })}
          textLength={35}
        />
        <EmptyTextModal
          show={this.state.emptyTextModal}
          onHide={() => this.setState({ emptyTextModal: false })}
        />
        <LoginModal
          show={this.state.loginModal}
          onHide={() => this.setState({ loginModal: false })}
        />
      </div>
    );
  }
}

export default AddComment;
