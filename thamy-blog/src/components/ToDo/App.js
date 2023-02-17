import * as React from 'react';
import styled from 'styled-components';

import Message from '../Message/Content';
import Card from './Card';
import Input from '../Form/Input';
import Button from '../Button/DefaultButton';

import BREAKPOINTS from '../../constants/breakpoints';

const Form = styled.form`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem 0;
    & > .input-text {
        flex: 1;
        height: 60px;
        padding-right: 130px;
        @media (max-width: ${BREAKPOINTS.tablet}){
            padding-right: 65px;
        }
    }
`

const AddButton = styled(Button)`
    width: auto;
    height: 60px;
    margin-left: -115px;
    padding-left: 1rem;
    padding-right: 1rem;
    & > i {
        display: none;
        font-style: normal;
    }
    @media (max-width: ${BREAKPOINTS.tablet}){
        margin-left: -56px;
        & > span {
            display: none;
        }
        & > i {
            display: block;
        }
    }
`

const List = styled.ul`
    display: flex;
    flex-flow: column;
    gap: .9rem;
`

const Container = styled.div`
    display: flex;
    flex-flow: column;
    gap: 2rem 0;
    margin-bottom: 3rem;
    padding: 2rem;
    background-color: ${(props) => props.theme.colors.bodyColor};
    border: ${(props) => props.theme.colors.border};
    @media (max-width: ${BREAKPOINTS.tablet}){
        gap: 1rem;
        padding: 0;
        background-color: transparent;
        border: 0;
    }
`

const StatusBar = styled.div`
    display: flex;
    justify-content: space-between;
    margin-top: 1rem;
    padding: 1rem;
    background-color: ${(props) => props.theme.colors.darkness};
    color: ${(props) => props.theme.colors.brightness};
`

const LeftItens = styled.span`
    font-weight: bold;
`

const EmptyTodo = styled.div`
    padding: 2rem 1rem;
    background-color: ${(props) => props.theme.colors.brightness};
    border: ${(props) => props.theme.colors.border};
    font-weight: ${(props) => props.theme.fonts.mediumTitle.fontWeight};
    text-align: center;
`

const App = () => {

    const toDoList = JSON.parse(localStorage.getItem("toDoList")) || []

    
    const [toDo, setToDo] = React.useState(toDoList);
    const [inputText, setInputText] = React.useState("");
    const [inputError, setInputError] = React.useState("");
    const [toDoStatus, setTodoStatus] = React.useState([]);
    
    const initStatus = React.useCallback(() => {
        let initList = [...toDo];
        let itensLeft = initList.filter((el) => !el.done);
        setTodoStatus({left: itensLeft.length});
    }, [toDo])

    const getText = React.useCallback((e) => {
        setInputText(e.target.value);
        let inputValididty = e.target.validity;
        if (inputValididty.valueMissing){
            setInputError("No todo? Beware, madness seek those who have nothing TO DO.");
        } else {
            setInputError("");
        }
    }, [])

    const blurInput = React.useCallback((e) => {
        setInputError("");
    }, []);

    const addToDo = React.useCallback((e) => {
        e.preventDefault();

        let randomId = Math.floor(Math.random() * (999 - 99 + 1) + 99);
        let newToDo = [...toDo];
        newToDo.push({ item: inputText, id: randomId, done: false });

        updateData(newToDo);

        setInputText("");
    }, [inputText, toDo]);

    
    const removeToDo = React.useCallback((index) => {
        let newToDo = [...toDo];
        newToDo.splice(index, 1);

        updateData(newToDo);
    }, [toDo]);

    const doneToDo = React.useCallback((index, e) => {
        let newToDo = [...toDo];
        let newItem = { ...newToDo[index], done: e.target.checked };
        newToDo.splice(index, 1, newItem);

        updateData(newToDo);
    }, [toDo]);

    function updateData(newData){
        setToDo(newData);
        localStorage.setItem("toDoList",JSON.stringify(newData));
    }

    React.useEffect(() => {
        initStatus();
    }, [toDo, initStatus]);

    return (
        <Container>
            <Form onSubmit={addToDo}>
                <Input
                    required
                    value={inputText}
                    onChange={getText}
                    onBlur={blurInput}
                    className="input-text"
                    type="text"
                    placeholder='I need to do...' />
                <Message className="--error" msgText={inputError} />
                <AddButton type='submit'>
                    <span>Add ToDo</span>
                    <i>&#x2795;</i>
                </AddButton>
            </Form>
            <div>
                <List>
                    {toDo.map(({ item, id, done }, index) => (
                        <Card
                            key={`card_item_${id}`}
                            onDoneToDo={doneToDo}
                            doneValue={done}
                            onRemove={removeToDo}
                            toDoItem={item}
                            toDoIndex={index} />
                    ))}
                </List>
                {toDo.length ? (
                    <StatusBar>
                        <LeftItens>
                            {toDoStatus.left}
                            {toDoStatus.left > 1 ? " Itens left" : " Item left"}
                        </LeftItens>
                    </StatusBar>
                ) : (
                    <EmptyTodo>Has your existential emptiness taken over the material realm?</EmptyTodo>
                )}
            </div>
        </Container>
    )
}


export default App;
