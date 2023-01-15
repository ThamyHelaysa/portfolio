import * as React from 'react';
import styled from 'styled-components';

import Button from '../Button/DefaultButton';
import InputCheckbox from '../Form/InputCheckbox';

import BREAKPOINTS from '../../constants/breakpoints';

const Item = styled.li`
    display: flex;
    align-items: center;
    padding: 1rem;
    background-color: ${(props) => props.theme.colors.bgColor};
    border: 2px solid ${(props) => props.theme.colors.terceary};
    & > span {
        word-wrap: break-word;
        @media (max-width: ${BREAKPOINTS.mobile}){
            max-width: 70%;
            padding-right: 10px;
        }
    }
`

const LabelContainer = styled.div`
    opacity: 1;
    transition: opacity 300ms ease 0s;
    .--checked > & {
        opacity: .5;
    }
`

const ItemLabel = styled.span`
    --thickness: .1em;
    --strike: 0;
    background: linear-gradient(90deg, transparent, currentColor 0) no-repeat 
                right center / calc(var(--strike) * 100%) var(--thickness);
    transition: background-size .4s ease;
    font: 25px Arial;
    padding: 0 .2em;
    .--checked > .--container > & {
        --strike: 1; /* "1" means "true" (show the strike line) */
        background-position-x: left;
    }
`

const RemoveButton = styled(Button)`
    margin-left: auto;
    opacity: 0;
    visibility: hidden;
    transition: all 300ms ease 0s;
    .--container:hover > & {
        opacity: 1;
        visibility: visible;
    }
    & > i {
        display: block;
        font-style: normal;
    }
    @media (max-width: ${BREAKPOINTS.tablet}){
        padding-left: .5rem;
        padding-right: .5rem;
    }
`

const Card = ({ toDoItem, toDoIndex, onRemove, onDoneToDo, doneValue }) => {

    const removeToDo = React.useCallback(() => {
        onRemove(toDoIndex);
    }, [onRemove,toDoIndex]);

    const checkDone = React.useCallback((e) => {
        onDoneToDo(toDoIndex,e);
    }, [onDoneToDo, toDoIndex]);

    return (
        <Item className={`${doneValue ? "--checked" : ""} --container`}>
            <InputCheckbox
                checkID={toDoIndex}
                checkValue={doneValue}
                onCheck={checkDone}></InputCheckbox>
            <LabelContainer className='--container'>
                <ItemLabel>{toDoItem}</ItemLabel>
            </LabelContainer>
            <RemoveButton onClick={removeToDo}>
                <i>&#x274C;</i>
            </RemoveButton>
        </Item>
    )
}

export default Card;
