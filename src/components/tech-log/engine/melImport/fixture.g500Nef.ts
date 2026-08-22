/**
 * A verbatim page of the approved P&G G500 D195 NEF Deferral List, kept so the parser has a
 * regression test against the real document rather than only against hand-built columns.
 *
 * Taken from `P&G_MEL_G500_5PG_6PG`, Revision 1 dated 09-03-25, page N-12, read with
 * `pdftotext -layout`. The leading line is the previous page's footer, which is where the
 * revision identity is printed — the parser reads identity from the body, never a filename (D95).
 */
export const G500_NEF_PAGE = ` Aircraft: G-500                                    Revision No: 1            Date: 09-03-25     Page N-11

 Item #       Item Name                    (M)(O) Procedures
                                         FLIGHT DECK ITEMS (100)
 N100-1       Ashtrays                     (M) None.
                                           (O) None.
 N100-2       Carpet                       May be worn, torn, or frayed as long as the item is otherwise
                                           serviceable.
                                           (M) None.
                                           (O) None.
 N100-3       Coat and / or Hat Hooks      (M) None.
                                           (O) None.
 N100-4       Crash Axe                    (M) None.
                                           (O) None.
 N100-5       Cup Holders                  (M) None.
                                           (O) None.
 N100-6       Curtains                     (M) None.
                                           (O) None.
 N100-7       Cushions                     May be worn, torn, or frayed as long as the item is otherwise
                                           serviceable.
                                           (M) None.
                                           (O) None.
 N100-8       Decorative Trim / Trim       (M) None.
              Strips                       (O) None.
 N100-9       Electrical Outlet            (M) Pull and secure circuit breaker(s) as required.
                                           (O) None.
 N100-10      Electrical Outlet Covers     (M) None.
                                           (O) None.
 N100-11      Foot Rests                   (M) None.
                                           (O) None.
 N100-12      Foot Tread Trim              (M) None.
                                           (O) None.

                                                    NEF
                                                                      NEF Program`.split('\n');
