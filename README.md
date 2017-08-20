SimpleTreeView
=============

## Description

A _simple_ treeview, based purely on data.
You define the tree by defining each entity that should be in the node, and the association to its parent.

## Features:
- Build a treeview based on your domain model, no logic required.
- Apply XPath constraints to each level in the treeview
- Define filters (XPath) that users can toggle
- Open pages from the treeview
- Allow lazy-loading (i.e. loading data only when node is opened)

## Limitations
- Multiple trees, with the same data, on one page is not supported 
- Applying a filter requires a reload of the tree 

## Dependencies

- [Mendix 6.x or higher](https://appstore.mendix.com/).

## Configuration

Add the .mpk in dist to your project.
Add the widget to a pages and select the entities that you want to use in the treeview.
