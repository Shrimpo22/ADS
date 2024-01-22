/**
 * Handles the 'message' event and performs a mathematical evaluation on provided data.
 * Imports the 'mathjs' library for mathematical parsing and evaluation.
 *
 * @param {MessageEvent} e - The message event containing the data for mathematical evaluation.
 *
 * @description
 * Parses the provided criteria, evaluates it for each object in the array, and calculates a score based on the criteria.
 * Supports basic arithmetic operations (+, -, *, /), comparison operators (<, <=, >, >=, ==, !=), and logical operators.
 * If the criteria involve inequality operators, the resulting score is normalized to a percentage of classesTotal.
 *
 * @returns {void}
 */
onmessage = function (e) {
    importScripts('https://cdnjs.cloudflare.com/ajax/libs/mathjs/7.0.2/math.min.js')
    const { objObjects, criteria, classesTotal } = e.data;
    const result = workerFunction(objObjects, criteria, classesTotal);
    postMessage(result);
};

/**
 * Performs the mathematical evaluation of objects against the provided criteria.
 *
 * @param {Object[]} objObjects - An array of objects to be evaluated against the criteria.
 * @param {string} criteria - The mathematical expression used to evaluate objects.
 * @param {number} classesTotal - The total number of classes used for normalizing inequality scores.
 * @returns {Object | null} - An object containing the evaluation result and relevant information,
 *                           or null if an error occurs during the parsing or evaluation process.
 */
function workerFunction(objObjects, criteria, classesTotal) {
    try {
        let inequality = false;
        const quotedCriteriaInput = criteria.replace(/\s/g, '');
        const parsedCriteria = math.parse(quotedCriteriaInput);

        if (['<', '<=', '>', '>=', '!=', '=='].includes(parsedCriteria.op)) {
            inequality = true;
        }

        let criteriaScore = 0;

        objObjects.forEach(object => {
            const terms = criteria.split(/\s*([+\-*/><=])\s*/);
            const filteredTerms = terms.filter(term => !/^[+\-*/><=]$|^\d+$/.test(term));
            const scope = {};

            filteredTerms.forEach(term => (scope[term.replace(/\s/g, '')] = isNaN(Number(object[term])) ? 0 : Number(object[term])));
            const evaluation = math.evaluate(quotedCriteriaInput, scope);

            if (inequality) {
                if (evaluation === true) criteriaScore++;
            } else criteriaScore += evaluation;
        });

        if (inequality) criteriaScore = (criteriaScore / classesTotal) * 100;

        return { inequality, criteriaScore };
    } catch (error) {
        console.error('Error parsing expression:', error);
        return null;
    }
}