
onmessage = function (e) {
    importScripts('https://cdnjs.cloudflare.com/ajax/libs/mathjs/7.0.2/math.min.js')
    const { objObjects, criteria, classesTotal } = e.data;
    const result = workerFunction(objObjects, criteria, classesTotal);
    postMessage(result);
};

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