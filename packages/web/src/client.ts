import { run, type RunState } from '@esroyo/ahp-cli/pure';

import { containsHtml, dataToHtmlTable } from './utils.ts';

/**
 * Enhanced console logging with better formatting, timestamp support, and log levels.
 * Provides structured output for the CLI application with configurable verbosity levels.
 *
 * @param config - Configuration object containing verbose level and debug flags
 */
function createLogger() {
    return {
        clear() {
            window.dialog.innerHTML = '';
            window.form.innerHTML = '';
            window.footer.innerHTML = '';
        },
        info(...data: unknown[]) {
            const newContent = data.some(containsHtml)
                ? data.join('\n')
                : data.join('<br>').replace(/\n/g, '<br>').replace(/ /g, '&nbsp;');
            const existingContent = window.dialog.innerHTML
                ? `${window.dialog.innerHTML}<br>`
                : '';
            window.dialog.innerHTML = `${existingContent}${newContent}`;
            window.dialog.scrollTo({
                top: window.dialog.scrollHeight,
                behavior: 'smooth'
            });
        },
        table(...data: unknown[]) {
            return this.info(dataToHtmlTable(...data));
        },
        error(...data: unknown[]) {
            console.error(...data);
        },
    };
}

let next = Promise.withResolvers();
window.handleSubmit = function (_event) {
    const form = document.querySelector('form');
    if (form?.checkValidity()) {
        const data = Object.fromEntries(
            Array.from(new FormData(form).entries())
                .map(([key, value]: [string, any]) => {
                    let [name, type] = key.split(':');
                    if (type === 'list') {
                        value = value.split(',').map(v => v.trim());
                    }
                    const nameParts = name.split('.');
                    if (nameParts.length === 2) {
                        name = nameParts[0];
                        value = { [nameParts[1]]: value };
                    }
                    return [name, value];
                })
        );
        // console.log(data);
        next.resolve(data);
    }
};

const nextReply = () => {
    next = Promise.withResolvers();
    return next.promise;
};

const phaseMap: Record<number, string> = {
    1: 'Setup',
    2: 'Comparing alternatives',
    3: 'Comparing criteria',
    4: 'Results',
};

const percentage = (pos: number, total: number): number =>
    Math.round(pos / total * 100);

const buildStatusLine = (runState: RunState) => {
    const progress = percentage(runState.totalStep, runState.totalSteps) || 0;
    const goal = `   Goal:         ${runState.decision?.goal || '?'}`;
    const criteria = `   Criteria:     (${
        runState.decision?.criteria.length || '?'
    }) ${runState.decision?.criteria.map((c) => c.name).join(', ') || '-'}`;
    const alternatives = `   Alternatives: (${
        runState.decision?.alternatives.length || '?'
    }) ${runState.decision?.alternatives.map((a) => a.name).join(', ') || '-'}`;
    const totalSteps = runState.totalSteps ? ` (${runState.totalStep}/${runState.totalSteps})` : '';
    const step = `<label for="progressbar">Progress: </label> <progress id="progressbar" value="${progress}" max="100">${progress}%</progress> <span>${progress}%${totalSteps}</span>`;
    const phase = `   Phase:        ${
        phaseMap[runState.phase]
    } (${runState.phaseStep}/${runState.phaseSteps})`;
    return ['', goal, criteria, alternatives, '', step, phase, '', ''].join('<br />');
};



const prompt = async <T>(questionOrQuestions: any, runState: RunState): Promise<T> => {
    // @ts-ignore
    window.runState = runState;
    window.footer.innerHTML = buildStatusLine(runState);
    const replies = {};
    const questions = Array.isArray(questionOrQuestions) ? questionOrQuestions : [questionOrQuestions];
    for (const question of questions) {
        if (question.type === 'input' || question.type === 'list') {
            window.form.innerHTML = `
<form onsubmit="handleSubmit(event)">
<label>${question.message}<br>
<input name="${question.name}:${question.type}" type="text" minlength="3" required autofocus />
</label>
<input type="submit" hidden />
<button type="button" onclick="handleSubmit(event);">Ok</button>
</form>
`; 
        }
        if (question.type === 'select') {
            window.form.innerHTML = `
<form>
<fieldset>
<legend>${question.message}</legend>
${question.choices.map((item, idx) => `
  <div>
    <label>${item.name}
    <input type="radio" name="${question.name}:${question.type}" value="${item.name}" ${idx === 0 ? 'checked ' : ''}/>
    </label>
  </div>
`).join('')}
</fieldset><br>
<button type="button" onclick="handleSubmit(event);">Ok</button>
</form>
`; 
        }
        if (question.type === 'scale') {
            window.form.innerHTML = `
<form>
<label>${question.message}<br>
${question.choices.map((choice) => `
<input type="range" name="${question.name}.${choice.name}:${question.type}" list="${question.name}.${choice.name}" min="0" max="${question.scale.length - 1}" step="1" value="1" autofocus />
<datalist id="${question.name}.${choice.name}">
    ${question.scale.map((item, idx) => `<option value="${idx}" label="${item.message} (${item.name})"></option>`).join('\n')}
</datalist>`)}
</label>
<button type="button" onclick="handleSubmit(event);">Ok</button>
</form>
<style>
datalist {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  writing-mode: vertical-lr;
  width: 100%;
}
option {
  padding: 0;
}
input[type="range"] {
  width: 100%;
  margin: 0;
}
</style>
`; 
        }
        Object.assign(replies, await nextReply());
    }
    return replies as T;
};

await run(prompt, createLogger());
