import * as React from 'react';
import styled from 'styled-components';

import Message from '../Message/Content';
import Card from './Card';
import Input from '../Form/Input';
import Button from '../Button/DefaultButton';

const Form = styled.form`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem 0;
    & > .input-text {
        flex: 1;
        height: 60px;
        border-color: ${(props) => props.theme.colors.terceary };
    }
`

const AddButton = styled(Button)`
    width: auto;
    height: 60px;
    margin-left: -115px;
    padding-left: 1rem;
    padding-right: 1rem;
    border-color: ${(props) => props.theme.colors.terceary };
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
`

const App = () => {

    const toDoList = JSON.parse(localStorage.getItem("toDoList")) || []

    const [toDo, setToDo] = React.useState(toDoList);
    const [inputText, setInputText] = React.useState("");
    const [inputError, setInputError] = React.useState("");

    const getText = React.useCallback((e) => {
        setInputText(e.target.value);
        let inputValididty = e.target.validity;
        if (inputValididty.valueMissing){
            setInputError("No value? Beware, madness seek those who dont have nothing to do.");
        } else {
            setInputError("");
        }
    }, [])

    const blurInput = React.useCallback((e) => {
        setInputError("");
    }, []);

    const addToDo = React.useCallback((e) => {
        e.preventDefault();

        let newToDo = [...toDo];
        newToDo.push({ item: inputText, id: newToDo.length });
        setToDo(newToDo);
        localStorage.setItem("toDoList",JSON.stringify(newToDo));
        setInputText("");
    }, [inputText, toDo]);

    
    const removeToDo = React.useCallback((index) => {
        let newToDo = [...toDo];
        newToDo.splice(index, 1);
        setToDo(newToDo);
        localStorage.setItem("toDoList",JSON.stringify(newToDo));
    }, [toDo])


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
                <AddButton type='submit'>Add ToDo</AddButton>
            </Form>
            <div>
                <List>
                    {toDo.map(({ item, id }, index) => (
                        <Card key={`item_${id}`} onRemove={removeToDo} toDoItem={item} toDoIndex={index} />
                    ))}
                </List>
            </div>
        </Container>
    )
}


export default App;
