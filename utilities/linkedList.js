class Node {
    constructor(value) {
        this.value = value;
        this.next = null;
    }
}

class LinkedList {
    constructor() {
        this.head = null;
    }

    append(value) {
        const newNode = new Node(value);

        if (!this.head) {
            this.head = newNode;
        } else {
            let current = this.head;
            while (current.next) {
                current = current.next;
            }
            current.next = newNode;
        }
    }

    push(value) {
        const newNode = new Node(value);
        newNode.next = this.head;
        this.head = newNode;
    }

    pop() {
        if (!this.head) {
            return undefined;
        }

        if (!this.head.next) {
            const poppedValue = this.head.value;
            this.head = null;
            return poppedValue;
        }

        let current = this.head;
        while (current.next.next) {
            current = current.next;
        }

        const poppedValue = current.next.value;
        current.next = null;
        return poppedValue;
    }

    peek() {
        return this.head ? this.head.value : undefined;
    }

    display() {
        let current = this.head;
        while (current) {
            console.log(current.value);
            current = current.next;
        }
    }
}

