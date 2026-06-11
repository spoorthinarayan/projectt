import React, { useState } from "react";

function InputBox({
    askQuestion
}) {

    const [question, setQuestion] =
        useState("");

    const handleAsk = () => {

        if (!question.trim())
            return;

        askQuestion(
            question,
            false
        );

        setQuestion("");

    };

    const handleMoreInfo = () => {

        if (!question.trim())
            return;

        askQuestion(
            question,
            true
        );

        setQuestion("");

    };

    const handleKeyDown = (
        e
    ) => {

        if (
            e.key === "Enter" &&
            !e.shiftKey
        ) {

            e.preventDefault();

            handleAsk();

        }

    };

    return (

        <div className="input-container">

            <div className="input-wrapper">

                <textarea

                    className="question-input"

                    placeholder="Ask a question from the textbook..."

                    value={question}

                    onChange={(e) =>
                        setQuestion(
                            e.target.value
                        )
                    }

                    onKeyDown={
                        handleKeyDown
                    }

                />

                <div className="button-row">

                    <button
                        className="send-btn"
                        onClick={
                            handleAsk
                        }
                    >
                        Ask
                    </button>

                    <button
                        className="more-btn"
                        onClick={
                            handleMoreInfo
                        }
                    >
                        More Information
                    </button>

                </div>

            </div>

        </div>

    );

}

export default InputBox;