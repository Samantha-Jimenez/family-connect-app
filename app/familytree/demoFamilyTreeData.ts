export const demoFamilyTreeData = {
  first_name: "Goody",
  last_name: "Addams",
  children: [
    {
      first_name: "Eudora",
      last_name: "Addams",
      children: [
        {
          first_name: "Gomez",
          last_name: "Addams",
          spouse: {
            first_name: "Morticia",
            last_name: "Addams",
          },
          children: [
            {
              first_name: "Wednesday",
              last_name: "Addams",
            },
            {
              first_name: "Pugsley",
              last_name: "Addams",
            },
            {
              first_name: "Pubert",
              last_name: "Addams",
            },
          ],
        },
        {
          first_name: "Fester",
          last_name: "Addams",
          spouse: {
            first_name: "Deborah",
            last_name: "Jellinsky-Addams",
          },
        },
      ],
    },
    {
      first_name: "Sloom",
      last_name: "Addams",
      children: [
        {
          first_name: "Itt",
          last_name: "Addams",
          nick_name: "Cousin Itt",
          spouse: {
            first_name: "Margaret",
            last_name: "Alford-Addams",
          },
          children: [
            {
              first_name: "What",
              last_name: "Addams",
            },
          ],
        },
      ],
    },
  ],
};

// The Addams Family tree structure:
// - Goody Addams (root/parent of Eudora and Sloom)
//   - Eudora 'Grandmama' Addams
//     - Gomez Addams (with spouse Morticia Addams)
//       - Wednesday Addams
//       - Pugsley Addams
//       - Pubert Addams
//     - Fester Addams (with spouse Deborah Jellinsky-Addams)
//   - Sloom Addams
//     - Itt 'Cousin Itt' Addams (with spouse Margaret Alford-Addams)
//       - What Addams
