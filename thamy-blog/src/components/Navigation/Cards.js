import * as React from 'react';
import styled from "styled-components";
// import { StaticImage, GatsbyImage, getImage } from "gatsby-plugin-image"
import { Link } from 'gatsby';

import { TitleH3 } from '../Paragraphs/PageTitle';
import { Paragraph } from '../Paragraphs/Paragraph';

import BREAKPOINTS from '../../constants/breakpoints';


const List = styled.div`
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fit, minmax(330px, 1fr));
    margin-bottom: 3rem;
    @media (max-width: ${BREAKPOINTS.tablet}){
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    }
    &:hover > .--item {
        opacity: 1;
        border-color: ${(props) => props.theme.colors.extra};
        border-style: dashed;
        &:not(:hover) {
            opacity: .2;
            border-color: inherit;
            border-style: solid;
        }
    }

    &.--flex {
        display: flex;
        flex-flow: column;
    }

`

const Item = styled.article`
    border: 4px solid;
    transition: all 300ms ease 0s;
    `

const StyledLink = styled(Link)`
    display: block;
    padding: 2rem;
    color: inherit;
    text-decoration: none;
`

const StyledParagraph = styled(Paragraph)`
    padding-top: 0;
`

const ImageCard = styled.div`
    margin-bottom: 1rem;
`

const LastPublishedLink = styled.div`
    background-color: ${({theme}) => theme.colors.yellow};
    font-weight: bold;
`

const CardsList = ({ dataList, lastPublished }) => {
    return (
        <List className={`${lastPublished && "--flex"}`}>
            {dataList.map((item,index) => (
                <Item key={item.id} className="--item">
                    <StyledLink to={item.excerpt ? `/blog/${item.frontmatter.slug}` : item.path}>
                        {item.image ? (
                            <ImageCard>
                                <img
                                    className='--proj-img'
                                    src={item.image.path}
                                    alt={item.name}/>
                            </ImageCard>
                        ) : (
                            ""
                        )}
                        <div>
                            <TitleH3>{ item.frontmatter ? item.frontmatter.title : item.title }</TitleH3>
                            <StyledParagraph>{ item.frontmatter ? item.frontmatter.desc : item.desc}</StyledParagraph>
                        </div>
                        {lastPublished &&
                            <LastPublishedLink className='--last-pub-link'>
                                Read more
                            </LastPublishedLink>}
                    </StyledLink>
                </Item>
            ))}
        </List>
    )
}


export default CardsList
