exports.feedbackReview = (data) => ({

    "type": "text",
    "text": `โปรดให้คะแนนสำหรับ ${data}\nสามารถให้คะแนนได้ตั้งแต่ 1 ถึง 5 ดาวค่ะ`,
    "quickReply": {
        "items": [{
                "type": "action",
                "action": {
                    "type": "message",
                    "label": "5 ดาว",
                    "text": "ให้ 5 ดาว"
                }
            },
            {
                "type": "action",
                "action": {
                    "type": "message",
                    "label": "4 ดาว",
                    "text": "ให้ 4 ดาว"
                }
            },
            {
                "type": "action",
                "action": {
                    "type": "message",
                    "label": "3 ดาว",
                    "text": "ให้ 3 ดาว"
                }
            },
            {
                "type": "action",
                "action": {
                    "type": "message",
                    "label": "2 ดาว",
                    "text": "ให้ 2 ดาว"
                }
            },
            {
                "type": "action",
                "action": {
                    "type": "message",
                    "label": "1 ดาว",
                    "text": "ให้ 1 ดาว"
                }
            },
            {
                "type": "action",
                "action": {
                    "type": "message",
                    "label": "ข้ามการให้คะแนน",
                    "text": "ข้าม"
                }
            }
        ]
    }

})