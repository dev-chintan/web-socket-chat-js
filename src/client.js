document.addEventListener("DOMContentLoaded", () => {
    const socket = new WebSocket("ws://localhost:3000");

    const messageList = document.getElementById("message-list");
    const messageInput = document.getElementById("message-input");
    const sendMessageBtn = document.getElementById("send-message");

    socket.onopen = () => {
        console.log("WebSocket open.");
    }

    socket.onmessage = (event) => {
        console.log("WebSocket message: " + event.data);
        messageList.value += event.data + "\n";
    }

    socket.onclose = () => {
        console.log("WebSocket closed.");
    }

    socket.onerror = (event) => {
        console.error("WebSocket error: " + event);
    }

    sendMessageBtn.addEventListener("click", () => {
        const message = messageInput.value.trim();
        if(!message) {
            alert("Please enter a message!");
            return;
        }
        socket.send(message);

        messageInput.value = "";
    })

    messageInput.addEventListener("keydown", (event) => {
        if(event.key === "Enter") {
            sendMessageBtn.click();
        }
    })
})
