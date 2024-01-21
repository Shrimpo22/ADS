/**
 * Represents a node in a linked list.
 * @class
 */
class Node {
    /**
     * Creates a new node with the given value.
     * @constructor
     * @param {*} value - The value to be stored in the node.
     */
    constructor(value) {
        this.value = value;
        this.next = null;
    }
}

/**
 * Represents a linked list.
 * @class
 */
class LinkedList {
    /**
     * Creates an empty linked list.
     * @constructor
     */
    constructor() {
        this.head = null;
    }

    /**
     * Appends a new node with the given value to the end of the linked list.
     * @param {*} value - The value to be appended.
     */
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

    /**
     * Adds a new node with the given value to the beginning of the linked list.
     * @param {*} value - The value to be pushed.
     */
    push(value) {
        const newNode = new Node(value);
        newNode.next = this.head;
        this.head = newNode;
    }

    /**
     * Removes and returns the value of the last node in the linked list.
     * @returns {*} - The value of the popped node.
     */
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

    /**
     * Returns the value of the first node in the linked list without removing it.
     * @returns {*} - The value of the first node.
     */
    peek() {
        return this.head ? this.head.value : undefined;
    }

    /**
     * Executes a provided function once for each node in the linked list.
     * @param {function} callback - Function to execute for each node.
     */
    forEach(callback) {
        let current = this.head;
        while (current) {
            callback(current.value);
            current = current.next;
        }
    }
}
